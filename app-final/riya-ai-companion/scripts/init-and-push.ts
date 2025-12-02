import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';

let connectionSettings: any;

async function getAccessToken() {
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

async function initAndPush() {
  console.log('\n🚀 Initializing and pushing to project1\n');
  
  const token = await getAccessToken();
  const owner = 'teamnuvoro';
  const repo = 'project1';
  
  console.log('✅ Got GitHub access token');
  
  const octokit = new Octokit({ auth: token });
  
  try {
    console.log('📝 Creating initial README to initialize repo...');
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'README.md',
      message: 'Initial commit: Initialize repository',
      content: Buffer.from(`# Riya AI Companion Chatbot

An AI-powered relationship companion chatbot featuring:
- Hinglish AI responses via Groq API
- Real-time chat with streaming
- Voice features via Sarvam AI
- Relationship analytics and insights
- Premium subscription system

## Tech Stack
- Frontend: React + TypeScript + Vite
- Backend: Express.js
- Database: Supabase PostgreSQL
- AI: Groq API (llama-3.3-70b-versatile)
- Voice: Sarvam AI (STT/TTS)

## Getting Started
\`\`\`bash
npm install
npm run dev
\`\`\`

---
Generated: ${new Date().toISOString()}
`).toString('base64'),
    });
    console.log('✅ Repository initialized with README');
  } catch (error: any) {
    if (error.status === 422) {
      console.log('✅ README already exists, continuing...');
    } else {
      throw error;
    }
  }
  
  console.log('\n📤 Setting up git remote with authentication...');
  
  const remoteUrl = `https://${token}@github.com/${owner}/${repo}.git`;
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    PUSH COMMANDS                              ║
╠═══════════════════════════════════════════════════════════════╣
║ Run these commands in the Shell:                              ║
║                                                               ║
║ 1. git remote set-url origin ${`https://github.com/${owner}/${repo}.git`.padEnd(35)}║
║ 2. git push -u origin main --force                            ║
║                                                               ║
║ Or use this one-liner:                                        ║
║ git push https://<token>@github.com/${owner}/${repo}.git main ║
╚═══════════════════════════════════════════════════════════════╝
`);

  console.log('\n🔗 Repository URL: https://github.com/' + owner + '/' + repo);
  console.log('\n✅ Repository is ready! Run the push commands above in Shell.');
  
  console.log('\n📋 Token for authenticated push (keep this private):');
  console.log('   ' + token.substring(0, 10) + '...' + token.substring(token.length - 5));
}

initAndPush().catch(console.error);
