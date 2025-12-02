import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.cache',
  '.replit',
  '.upm',
  'dist',
  '.env',
  '.env.local',
  'riya-updates.zip',
  'riya-complete-updates.zip',
  '*.log',
  '.DS_Store',
  'package-lock.json',
  '.config',
  'replit.nix',
  '.breakpoints',
  'generated-icon.png',
  'tsconfig.tsbuildinfo'
];

function shouldIgnore(filePath: string): boolean {
  const fileName = path.basename(filePath);
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.startsWith('*')) {
      const ext = pattern.slice(1);
      if (fileName.endsWith(ext)) return true;
    } else if (normalizedPath.includes(pattern) || fileName === pattern) {
      return true;
    }
  }
  return false;
}

function getAllFiles(dirPath: string, baseDir: string = dirPath): string[] {
  const files: string[] = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (shouldIgnore(relativePath) || shouldIgnore(item)) {
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getAllFiles(fullPath, baseDir));
      } else if (stat.isFile()) {
        files.push(relativePath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return files;
}

async function pushToGitHub(owner: string, repo: string) {
  console.log(`\n🚀 Pushing all code to ${owner}/${repo}\n`);
  
  const octokit = await getGitHubClient();
  const baseDir = process.cwd();
  
  const allFiles = getAllFiles(baseDir);
  console.log(`📁 Found ${allFiles.length} files to push\n`);
  
  const blobs: { path: string; sha: string; mode: string; type: string }[] = [];
  
  let processed = 0;
  for (const filePath of allFiles) {
    try {
      const fullPath = path.join(baseDir, filePath);
      const content = fs.readFileSync(fullPath);
      const base64Content = content.toString('base64');
      
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content: base64Content,
        encoding: 'base64',
      });
      
      blobs.push({
        path: filePath.replace(/\\/g, '/'),
        sha: blob.sha,
        mode: '100644',
        type: 'blob',
      });
      
      processed++;
      if (processed % 20 === 0 || processed === allFiles.length) {
        console.log(`   Uploaded ${processed}/${allFiles.length} files...`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error uploading ${filePath}: ${error.message}`);
    }
  }
  
  console.log(`\n📦 Creating commit tree...`);
  
  let baseTree: string | undefined;
  try {
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: 'heads/main',
    });
    const { data: commit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: ref.object.sha,
    });
    baseTree = commit.tree.sha;
  } catch (error) {
    console.log('   Creating new branch (no existing commits)');
  }
  
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    tree: blobs,
    base_tree: baseTree,
  });
  
  console.log(`📝 Creating commit...`);
  
  let parents: string[] = [];
  try {
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: 'heads/main',
    });
    parents = [ref.object.sha];
  } catch (error) {
  }
  
  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message: 'Initial commit: Riya AI Companion Chatbot - Complete codebase with all UI updates',
    tree: tree.sha,
    parents,
  });
  
  console.log(`🔗 Updating main branch...`);
  
  try {
    await octokit.git.updateRef({
      owner,
      repo,
      ref: 'heads/main',
      sha: commit.sha,
      force: true,
    });
  } catch (error) {
    await octokit.git.createRef({
      owner,
      repo,
      ref: 'refs/heads/main',
      sha: commit.sha,
    });
  }
  
  console.log(`\n✅ SUCCESS! All code pushed to GitHub!\n`);
  console.log(`🔗 Repository: https://github.com/${owner}/${repo}`);
  console.log(`📋 Commit: ${commit.sha.substring(0, 7)}`);
  console.log(`📁 Files pushed: ${blobs.length}`);
}

const owner = 'teamnuvoro';
const repo = process.argv[2] || 'project1';

pushToGitHub(owner, repo).catch(console.error);
