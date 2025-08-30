import { z } from 'zod';

// ===== USER TYPES =====
export const UserRoleSchema = z.enum(['ADMIN', 'MANAGER', 'MEMBER']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: UserRoleSchema,
  avatar: z.string().url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// ===== PROJECT TYPES =====
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  ownerId: z.string().uuid(),
  owner: UserSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Project = z.infer<typeof ProjectSchema>;

// ===== TASK TYPES =====
export const TaskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskStatusSchema = z.enum(['BACKLOG', 'IN_PROGRESS', 'DONE']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  dueDate: z.date().optional(),
  assigneeId: z.string().uuid().optional(),
  assignee: UserSchema.optional(),
  projectId: z.string().uuid(),
  project: ProjectSchema.optional(),
  labels: z.array(z.string().uuid()).default([]),
  attachments: z.array(z.string().uuid()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Task = z.infer<typeof TaskSchema>;

// ===== LABEL TYPES =====
export const LabelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  projectId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Label = z.infer<typeof LabelSchema>;

// ===== COMMENT TYPES =====
export const CommentSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  taskId: z.string().uuid(),
  authorId: z.string().uuid(),
  author: UserSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Comment = z.infer<typeof CommentSchema>;

// ===== ATTACHMENT TYPES =====
export const AttachmentSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().positive(),
  taskId: z.string().uuid(),
  uploadedById: z.string().uuid(),
  uploadedBy: UserSchema.optional(),
  createdAt: z.date(),
});

export type Attachment = z.infer<typeof AttachmentSchema>;

// ===== API REQUEST/RESPONSE TYPES =====

// Auth
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: UserRoleSchema.optional(),
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

// Project
export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const UpdateProjectRequestSchema = CreateProjectRequestSchema.partial();

// Task
export const CreateTaskRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  labelIds: z.array(z.string().uuid()).optional(),
});

export const UpdateTaskRequestSchema = CreateTaskRequestSchema.partial().extend({
  id: z.string().uuid(),
});

export const ChangeTaskStatusRequestSchema = z.object({
  status: TaskStatusSchema,
});

// Comment
export const CreateCommentRequestSchema = z.object({
  content: z.string().min(1),
  taskId: z.string().uuid(),
});

export const UpdateCommentRequestSchema = z.object({
  content: z.string().min(1),
});

// Label
export const CreateLabelRequestSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  projectId: z.string().uuid(),
});

export const UpdateLabelRequestSchema = CreateLabelRequestSchema.partial();

// ===== QUERY TYPES =====
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export const TaskQuerySchema = PaginationQuerySchema.extend({
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assigneeId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  labelIds: z.array(z.string().uuid()).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const ProjectQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional(),
  ownerId: z.string().uuid().optional(),
});

// ===== API RESPONSE TYPES =====
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: z.object({
      page: z.number().optional(),
      limit: z.number().optional(),
      total: z.number().optional(),
      totalPages: z.number().optional(),
    }).optional(),
    error: z.string().optional(),
  });

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });

// ===== DASHBOARD TYPES =====
export const DashboardStatsSchema = z.object({
  totalTasks: z.number(),
  completedTasks: z.number(),
  overdueTasks: z.number(),
  totalProjects: z.number(),
  recentTasks: z.array(TaskSchema),
  weeklyCompletedTasks: z.array(z.object({
    date: z.string(),
    count: z.number(),
  })),
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

// ===== EXPORT ALL TYPES =====
export type {
  User,
  Project,
  Task,
  Label,
  Comment,
  Attachment,
  UserRole,
  TaskPriority,
  TaskStatus,
  DashboardStats,
};

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;
export type CreateCommentRequest = z.infer<typeof CreateCommentRequestSchema>;
export type CreateLabelRequest = z.infer<typeof CreateLabelRequestSchema>;
export type TaskQuery = z.infer<typeof TaskQuerySchema>;
export type ProjectQuery = z.infer<typeof ProjectQuerySchema>;
