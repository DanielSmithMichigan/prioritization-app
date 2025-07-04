# 🗂️ Work Prioritization App

## 📌 Overview

This project is a tool to help teams prioritize work by comparing stories across multiple dimensions by assigning ratings to each story. These ratings can be translated to known metrics such as "story points." Each story belongs to a category (e.g., _operations_, _accounting_, _technical_) which represents the functional area it benefits.

Team members participate in structured sessions where they compare pairs of stories based on metrics like:

- **Impact**
- **Estimated Time to Completion**
- **Risk of Unexpected Complexity**
- **Visibility**

In each session, multiple users will see a list of stories and they will put them somewhere along a slider. On the slider you will see some anchor stories that most users are familiar with.

- **X-axis**: `estimatedTime / risk`
- **Y-axis**: `impact`
- **Red circles**: highlight stories exceeding a visibility threshold

Below the graph, a sorted list of stories is shown, ordered by a custom formula (e.g., normalized X + Y values).

---

## 💼 Multi-Tenancy Support

This application is designed for SaaS usage. Multiple **tenants (organizations)** will use the system, each with its **own isolated universe of data**. Every story, comparison, and user is scoped by a `tenantId`.

---

## ⚙️ Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: AWS Lambda (Node.js)
- **Database**: DynamoDB (partitioned by tenant)
- **Graph Rendering**: (Planned) Static image export via canvas or server-side rendering
- **Architecture**: Serverless, multi-tenant, session-based voting

---

## 🧱 Data Structures

### 📝 `Story`

```ts
interface EloRating {
  rating: number;
  uncertainty: number;
  history?: number[];
}

interface Story {
  id: string;
  tenantId: string;

  title: string;
  description?: string;
  category: 'operations' | 'accounting' | 'technical' | string;

  elo: {
    impact: EloRating;
    estimatedTime: EloRating;
    risk: EloRating;
    visibility: EloRating;
  };

  createdAt: string;
  updatedAt?: string;
  archived?: boolean;
}
```
### ⚔️ EloComparison

```ts
interface EloComparison {
  id: string;
  tenantId: string;

  userId: string;
  sessionId?: string;

  metric: 'impact' | 'estimatedTime' | 'risk' | 'visibility';

  leftStoryId: string;
  rightStoryId: string;
  winnerStoryId: string;

  timestamp: string;
}
```
