// Admin API client
// Admin auth is entirely credential-based (username + password against env vars).
// There is no MongoDB User record for admins and no GitHub OAuth involved.

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

/**
 * POST /api/auth/admin/login
 * Body: { username, password }
 * Returns: { token, user: { username, isAdmin } }
 *
 * Backend verifies credentials against ADMIN_USERNAME/ADMIN_PASSWORD env vars,
 * then returns a signed JWT. No database record is created or queried.
 */
export async function adminLogin({ username, password }) {
  const res = await fetch(`${BASE_URL}/auth/admin/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.message || "Login failed");
    err.forbidden = !!data.forbidden;
    err.loginRequired = !!data.loginRequired;
    throw err;
  }

  return data; // { token, user }
}

function getAdminHeaders() {
  const token = localStorage.getItem("jwt");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJsonResponse(res, fallbackMessage) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("jwt");
      localStorage.removeItem("adminUser");
      window.location.href = "/hackstack/admin/login";
    }
    throw new Error(data.message || fallbackMessage);
  }

  return data;
}

export async function createAdminModule(moduleData) {
  const res = await fetch(`${BASE_URL}/admin/modules`, {
    method: "POST",
    credentials: "include",
    headers: getAdminHeaders(),
    body: JSON.stringify(moduleData),
  });

  return parseJsonResponse(res, "Failed to create module");
}

export async function createAdminQuiz(quizData) {
  const res = await fetch(`${BASE_URL}/admin/quizzes`, {
    method: "POST",
    credentials: "include",
    headers: getAdminHeaders(),
    body: JSON.stringify(quizData),
  });

  return parseJsonResponse(res, "Failed to create quiz");
}

export async function listAdminModules() {
  const res = await fetch(`${BASE_URL}/admin/modules`, {
    credentials: "include",
    headers: getAdminHeaders(),
  });

  return parseJsonResponse(res, "Failed to load modules");
}

export async function getAdminModule(moduleId) {
  const res = await fetch(`${BASE_URL}/admin/modules/${moduleId}`, {
    credentials: "include",
    headers: getAdminHeaders(),
  });

  return parseJsonResponse(res, "Failed to load module");
}

export async function updateAdminModule(moduleId, moduleData) {
  const res = await fetch(`${BASE_URL}/admin/modules/${moduleId}`, {
    method: "PUT",
    credentials: "include",
    headers: getAdminHeaders(),
    body: JSON.stringify(moduleData),
  });

  return parseJsonResponse(res, "Failed to update module");
}

export async function deleteAdminModule(moduleId) {
  const res = await fetch(`${BASE_URL}/admin/modules/${moduleId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAdminHeaders(),
  });

  return parseJsonResponse(res, "Failed to delete module");
}

export async function listAdminQuizzes() {
  const res = await fetch(`${BASE_URL}/admin/quizzes`, {
    credentials: "include",
    headers: getAdminHeaders(),
  });

  return parseJsonResponse(res, "Failed to load quizzes");
}

export async function updateAdminQuiz(quizId, quizData) {
  const res = await fetch(`${BASE_URL}/admin/quizzes/${quizId}`, {
    method: "PATCH",
    credentials: "include",
    headers: getAdminHeaders(),
    body: JSON.stringify(quizData),
  });

  return parseJsonResponse(res, "Failed to update quiz");
}

export async function deleteAdminQuiz(quizId) {
  const res = await fetch(`${BASE_URL}/admin/quizzes/${quizId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAdminHeaders(),
  });

  return parseJsonResponse(res, "Failed to delete quiz");
}

// ─── Mock login (remove once backend is live) ──────────────────────────────
// Set VITE_USE_MOCK=true in .env.development to use this.
export async function mockAdminLogin({ username, password }) {
  await new Promise((r) => setTimeout(r, 800)); // simulate network

  if (username === "admin" && password === "hackstack123") {
    return {
      token: "mock_jwt_token",
      user: { _id: "admin_001", username: "admin", avatarUrl: "", isAdmin: true, canDelete: true },
    };
  }
  throw new Error("Invalid credentials");
}

export async function getAdminStats() {
  const res = await fetch(`${BASE_URL}/admin/stats`, {
    credentials: "include",
    headers: getAdminHeaders(),
  });
  return parseJsonResponse(res, "Failed to load admin stats");
}

export async function fetchModulesPublic() {
  const res = await fetch(`${BASE_URL}/modules`, {
    credentials: "include",
  });
  return parseJsonResponse(res, "Failed to load modules");
}

export async function fetchQuizzesPublic() {
  const res = await fetch(`${BASE_URL}/quizzes`, {
    credentials: "include",
  });
  return parseJsonResponse(res, "Failed to load quizzes");
}

export async function mockGetAdminStats() {
  await new Promise((r) => setTimeout(r, 300));
  return {
    totalUsers: 8,
    totalModules: 3,
    activeQuizzes: 5,
  };
}

export async function mockFetchModulesPublic() {
  await new Promise((r) => setTimeout(r, 300));
  return [{}, {}, {}];
}

export async function mockFetchQuizzesPublic() {
  await new Promise((r) => setTimeout(r, 300));
  return [{}, {}, {}, {}, {}];
}

export async function getAdminUsersProgress() {
  const res = await fetch(`${BASE_URL}/admin/users-progress`, {
    credentials: "include",
    headers: getAdminHeaders(),
  });
  return parseJsonResponse(res, "Failed to load users progress");
}

export async function mockGetAdminUsersProgress() {
  await new Promise((r) => setTimeout(r, 400));
  return [
    {
      _id: "u1",
      username: "john_doe",
      email: "john@example.com",
      avatarUrl: "",
      totalScore: 180,
      modulesProgress: [
        {
          moduleId: "m1",
          title: "Introduction to Javascript",
          slug: "intro-js",
          daysCompleted: 5,
          totalDays: 10,
          moduleScore: 120,
        },
        {
          moduleId: "m2",
          title: "Advanced React",
          slug: "adv-react",
          daysCompleted: 2,
          totalDays: 5,
          moduleScore: 60,
        },
      ],
    },
    {
      _id: "u2",
      username: "alice_smith",
      email: "alice@example.com",
      avatarUrl: "",
      totalScore: 90,
      modulesProgress: [
        {
          moduleId: "m1",
          title: "Introduction to Javascript",
          slug: "intro-js",
          daysCompleted: 3,
          totalDays: 10,
          moduleScore: 90,
        },
      ],
    },
  ];
}

export async function getAdminNotifications() {
  const res = await fetch(`${BASE_URL}/notifications/admin`, {
    credentials: "include",
    headers: getAdminHeaders(),
  });
  return parseJsonResponse(res, "Failed to load notifications");
}

export async function createAdminNotification(data) {
  const res = await fetch(`${BASE_URL}/notifications/admin`, {
    method: "POST",
    credentials: "include",
    headers: getAdminHeaders(),
    body: JSON.stringify(data),
  });
  return parseJsonResponse(res, "Failed to create notification");
}

export async function toggleAdminNotification(id, data) {
  const res = await fetch(`${BASE_URL}/notifications/admin/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: getAdminHeaders(),
    body: JSON.stringify(data),
  });
  return parseJsonResponse(res, "Failed to update notification");
}

export async function deleteAdminNotification(id) {
  const res = await fetch(`${BASE_URL}/notifications/admin/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAdminHeaders(),
  });
  return parseJsonResponse(res, "Failed to delete notification");
}

// ── Progress Editor API ─────────────────────────────────────────────────────

export async function getProgressEditorUsers() {
  const res = await fetch(`${BASE_URL}/admin/progress-editor/users`, {
    credentials: "include",
    headers: getAdminHeaders(),
  });
  return parseJsonResponse(res, "Failed to load users with progress");
}

export async function getProgressEditorUser(userId) {
  const res = await fetch(`${BASE_URL}/admin/progress-editor/users/${userId}`, {
    credentials: "include",
    headers: getAdminHeaders(),
  });
  return parseJsonResponse(res, "Failed to load user progress");
}

export async function updateProgressEditorUserModule(userId, moduleId, data) {
  const res = await fetch(
    `${BASE_URL}/admin/progress-editor/users/${userId}/modules/${moduleId}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: getAdminHeaders(),
      body: JSON.stringify(data),
    }
  );
  return parseJsonResponse(res, "Failed to update user progress");
}

export async function getProgressEditorModules() {
  const res = await fetch(`${BASE_URL}/admin/progress-editor/modules`, {
    credentials: "include",
    headers: getAdminHeaders(),
  });
  return parseJsonResponse(res, "Failed to load modules with progress");
}

