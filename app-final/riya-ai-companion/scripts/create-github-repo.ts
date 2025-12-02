import { Octokit } from '@octokit/rest';

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
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
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

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function createRepository(repoName: string) {
  try {
    console.log(`\n🚀 Creating GitHub repository: ${repoName}\n`);
    
    const octokit = await getUncachableGitHubClient();
    
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`✅ Authenticated as: ${user.login}`);
    
    try {
      const { data: repo } = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'Riya AI Companion Chatbot - Full-stack React + Express app with Hinglish AI, voice features, and relationship insights',
        private: false,
        auto_init: false,
      });
      
      console.log(`✅ Repository created: ${repo.html_url}`);
      console.log(`\n📋 Next steps to push your code:\n`);
      console.log(`1. Remove the old remote (if exists):`);
      console.log(`   git remote remove origin`);
      console.log(`\n2. Add the new remote:`);
      console.log(`   git remote add origin ${repo.clone_url}`);
      console.log(`\n3. Push your code:`);
      console.log(`   git push -u origin main`);
      console.log(`\n🔗 Repository URL: ${repo.html_url}`);
      
      return repo;
    } catch (error: any) {
      if (error.status === 422) {
        console.log(`⚠️  Repository "${repoName}" already exists.`);
        const { data: existingRepo } = await octokit.repos.get({
          owner: user.login,
          repo: repoName,
        });
        console.log(`🔗 Existing repository: ${existingRepo.html_url}`);
        return existingRepo;
      }
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

const repoName = process.argv[2] || 'project1';
createRepository(repoName);
