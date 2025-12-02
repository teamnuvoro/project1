import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken! } }
  ).then(res => res.json()).then(data => data.items?.[0]);

  return connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const IGNORE = ['node_modules', '.git', '.cache', '.replit', '.upm', 'dist', '.env', '.config', 'replit.nix', '.breakpoints', 'package-lock.json', 'tsconfig.tsbuildinfo', '.zip'];

function shouldIgnore(filePath: string): boolean {
  return IGNORE.some(p => filePath.includes(p));
}

function getAllFiles(dirPath: string, baseDir: string = dirPath): string[] {
  const files: string[] = [];
  try {
    for (const item of fs.readdirSync(dirPath)) {
      const fullPath = path.join(dirPath, item);
      const relativePath = path.relative(baseDir, fullPath);
      if (shouldIgnore(relativePath) || item.startsWith('.')) continue;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) files.push(...getAllFiles(fullPath, baseDir));
      else if (stat.isFile() && stat.size < 1000000) files.push(relativePath);
    }
  } catch (e) {}
  return files;
}

async function uploadFile(octokit: Octokit, owner: string, repo: string, filePath: string, branch: string) {
  const fullPath = path.join(process.cwd(), filePath);
  const content = fs.readFileSync(fullPath);
  
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: filePath, ref: branch });
    if (!Array.isArray(data) && 'sha' in data) sha = data.sha;
  } catch (e) {}
  
  await octokit.repos.createOrUpdateFileContents({
    owner, repo,
    path: filePath,
    message: `Add ${filePath}`,
    content: content.toString('base64'),
    branch,
    sha
  });
}

async function main() {
  const owner = 'teamnuvoro';
  const repo = 'project1';
  const branch = 'main';
  
  console.log('\n🚀 Pushing code to', owner + '/' + repo, '\n');
  
  const token = await getAccessToken();
  const octokit = new Octokit({ auth: token });
  
  const allFiles = getAllFiles(process.cwd());
  console.log(`📁 Found ${allFiles.length} files to upload\n`);
  
  const priorityFiles = allFiles.filter(f => 
    f.includes('package.json') || 
    f.includes('tsconfig') || 
    f.includes('vite.config') ||
    f.includes('tailwind.config') ||
    f.includes('drizzle.config') ||
    f.endsWith('.md')
  );
  
  const srcFiles = allFiles.filter(f => 
    !priorityFiles.includes(f) && 
    (f.startsWith('client/') || f.startsWith('server/') || f.startsWith('shared/'))
  );
  
  const otherFiles = allFiles.filter(f => 
    !priorityFiles.includes(f) && !srcFiles.includes(f)
  );
  
  const orderedFiles = [...priorityFiles, ...srcFiles, ...otherFiles];
  
  let uploaded = 0;
  let failed: string[] = [];
  
  for (const file of orderedFiles) {
    try {
      process.stdout.write(`   [${uploaded + 1}/${orderedFiles.length}] ${file}...`);
      await uploadFile(octokit, owner, repo, file.replace(/\\/g, '/'), branch);
      console.log(' ✅');
      uploaded++;
      
      if (uploaded % 5 === 0) {
        console.log('   ⏳ Pausing to avoid rate limit...');
        await sleep(2000);
      }
    } catch (error: any) {
      console.log(' ❌');
      failed.push(file);
      if (error.message?.includes('rate limit')) {
        console.log('   ⚠️ Rate limited, waiting 30 seconds...');
        await sleep(30000);
      } else {
        await sleep(500);
      }
    }
  }
  
  console.log(`\n✅ Uploaded: ${uploaded}/${orderedFiles.length} files`);
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length} files`);
  }
  console.log(`\n🔗 https://github.com/${owner}/${repo}`);
}

main().catch(console.error);
