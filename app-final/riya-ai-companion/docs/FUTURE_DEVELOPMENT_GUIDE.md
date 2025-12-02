# Future Development Guide

Complete guide for adding features independently using Cursor (or any IDE).

---

## Development Stack

| Layer | Technology | Location |
|-------|------------|----------|
| Frontend | React + Vite + TypeScript | `client/` |
| Backend | Supabase Edge Functions | `supabase/functions/` |
| Database | Supabase PostgreSQL | `shared/schema.ts` |
| Hosting | Vercel (frontend) | Auto-deploy from GitHub |

---

## 1. Local Development Workflow

### 1.1 Open Project in Cursor

```bash
# Clone from GitHub (first time only)
git clone https://github.com/YOUR_USERNAME/riya-ai-companion.git
cd riya-ai-companion

# Open in Cursor
cursor .
```

### 1.2 Install Dependencies

```bash
npm install
```

### 1.3 Set Up Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 1.4 Start Development Server

```bash
npm run dev
```

Opens at http://localhost:5000

### 1.5 Make Code Changes

Edit files in Cursor. Hot reload updates the browser automatically.

### 1.6 Test Changes

1. Check browser for UI changes
2. Open DevTools > Console for errors
3. Check Network tab for API calls
4. Test the feature manually

### 1.7 Commit to GitHub

```bash
# Check what changed
git status
git diff

# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add new feature X"

# Push to GitHub
git push origin main
```

### 1.8 Auto-Deploy to Vercel

Vercel automatically deploys when you push to main:
1. Push triggers build
2. Build takes 2-5 minutes
3. New version goes live
4. Check Vercel dashboard for status

---

## 2. Add New Supabase Edge Function

### 2.1 Create Function Directory

```bash
mkdir -p supabase/functions/my-new-function
```

### 2.2 Create Function File

Create `supabase/functions/my-new-function/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { someParam } = await req.json();

    // Your logic here
    const result = await doSomething(someParam);

    // Return response
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});

async function doSomething(param: string) {
  // Your business logic
  return { processed: param };
}
```

### 2.3 Test Locally with Supabase CLI

```bash
# Install Supabase CLI (first time)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Serve functions locally
supabase functions serve my-new-function --env-file .env
```

### 2.4 Deploy to Supabase

```bash
# Deploy single function
supabase functions deploy my-new-function

# Deploy all functions
supabase functions deploy
```

### 2.5 Set Secrets (if needed)

```bash
supabase secrets set MY_API_KEY=your-api-key
```

---

## 3. Add New Frontend Feature

### 3.1 Create New Page

Create `client/src/pages/MyNewPage.tsx`:

```typescript
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function MyNewPage() {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState("");

  // Fetch data from Edge Function
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-data"],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/my-new-function`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ someParam: "value" }),
        }
      );
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  // Mutation example
  const mutation = useMutation({
    mutationFn: async (newValue: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/my-new-function`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ someParam: newValue }),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Action completed." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="container mx-auto p-6" data-testid="my-new-page">
      <Card>
        <CardHeader>
          <CardTitle>My New Feature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            placeholder="Enter something..."
            data-testid="input-value"
          />
          <Button 
            onClick={() => mutation.mutate(inputValue)}
            disabled={mutation.isPending}
            data-testid="button-submit"
          >
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
          
          <pre className="bg-muted p-4 rounded">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.2 Add Route

Edit `client/src/App.tsx`:

```typescript
import MyNewPage from "@/pages/MyNewPage";

// Add to Router
<Route path="/my-new-page" component={MyNewPage} />
```

### 3.3 Add Navigation

Edit `client/src/components/app-sidebar.tsx` (or wherever navigation lives):

```typescript
{
  title: "My New Feature",
  url: "/my-new-page",
  icon: Star, // import from lucide-react
}
```

### 3.4 Style with Tailwind

Use Tailwind classes directly:

```tsx
<div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-pink-100 to-purple-100">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
  <p className="text-gray-600">Description text</p>
  <Button className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
    Action
  </Button>
</div>
```

### 3.5 Use shadcn Components

Import from `@/components/ui/`:

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

---

## 4. Database Changes

### 4.1 Add New Table

Edit `shared/schema.ts`:

```typescript
import { pgTable, serial, text, timestamp, integer, boolean, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Add new table
export const myNewTable = pgTable("my_new_table", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create insert schema (for validation)
export const insertMyNewTableSchema = createInsertSchema(myNewTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertMyNewTable = z.infer<typeof insertMyNewTableSchema>;
export type MyNewTable = typeof myNewTable.$inferSelect;
```

### 4.2 Add Column to Existing Table

```typescript
// In shared/schema.ts, add to existing table definition:
export const users = pgTable("users", {
  // ... existing columns ...
  newColumn: text("new_column"),  // Add new column
});
```

### 4.3 Push Changes to Database

```bash
# Push schema changes (safe, non-destructive)
npm run db:push

# If conflicts occur, use force (careful!)
npm run db:push --force
```

### 4.4 View Database

```bash
# Open Drizzle Studio
npm run db:studio
```

Or use Supabase Dashboard > Table Editor

### 4.5 Update Storage Interface (if using Express)

Edit `server/storage.ts`:

```typescript
// Add interface method
interface IStorage {
  // ... existing methods ...
  createMyNewItem(data: InsertMyNewTable): Promise<MyNewTable>;
  getMyNewItems(userId: string): Promise<MyNewTable[]>;
}

// Implement in SupabaseStorage class
async createMyNewItem(data: InsertMyNewTable): Promise<MyNewTable> {
  const { data: result, error } = await this.supabase
    .from("my_new_table")
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
}
```

---

## 5. Deployment Workflow

### 5.1 Commit and Push

```bash
# Stage all changes
git add .

# Commit with descriptive message
# Use conventional commits: feat:, fix:, docs:, chore:
git commit -m "feat: add new feature X"

# Push to GitHub
git push origin main
```

### 5.2 Vercel Auto-Deploy

1. Push triggers automatic build
2. Build logs visible in Vercel dashboard
3. Preview URL available immediately
4. Production updated in 2-5 minutes

### 5.3 Check Deployment Status

**Vercel Dashboard:**
1. Go to https://vercel.com/dashboard
2. Click your project
3. View "Deployments" tab
4. Check build logs if failed

**Check Live Site:**
1. Visit your production URL
2. Hard refresh (Ctrl+Shift+R)
3. Check DevTools for errors

### 5.4 Deploy Edge Functions

```bash
# Deploy all Edge Functions
supabase functions deploy

# Deploy specific function
supabase functions deploy my-new-function

# Check logs
supabase functions logs my-new-function
```

---

## 6. Quick Reference Commands

### Daily Development

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `git push origin main` | Deploy to production |

### Database

| Command | Purpose |
|---------|---------|
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |

### Supabase Functions

| Command | Purpose |
|---------|---------|
| `supabase functions serve` | Serve locally |
| `supabase functions deploy` | Deploy all functions |
| `supabase functions logs` | View logs |
| `supabase secrets set KEY=val` | Set secrets |

---

## 7. File Structure Reference

```
riya-ai-companion/
├── client/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable components
│   │   │   └── ui/           # shadcn components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities
│   │   │   ├── edgeFunctions.ts  # Edge Function API client
│   │   │   └── supabase.ts       # Supabase client
│   │   └── contexts/         # React contexts
│   └── index.html
├── server/                    # Express backend (fallback)
│   ├── routes.ts             # API routes
│   └── storage.ts            # Database operations
├── shared/
│   └── schema.ts             # Database schema + types
├── supabase/
│   └── functions/            # Edge Functions
│       ├── chat-v2/
│       └── user-summary/
├── docs/                      # Documentation
├── .env.example              # Environment template
├── vercel.json               # Vercel config
└── package.json
```

---

## 8. You Are Now Independent

**Your workflow is now:**

1. **Edit** code in Cursor
2. **Test** with `npm run dev`
3. **Commit** to GitHub
4. **Auto-deploy** to Vercel

**No Replit required!**

- Code lives in GitHub
- Frontend deploys to Vercel automatically
- Backend runs on Supabase Edge Functions
- Database on Supabase PostgreSQL
- Full control over your codebase
