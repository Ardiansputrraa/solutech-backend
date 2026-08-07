import { authService } from "@/lib/modules/auth/auth.service";
import { authRepository } from "@/lib/modules/auth/auth.repository";
import { AppError } from "@/lib/errors/AppError";
import { RoleName } from "@/generated/prisma";
import bcrypt from "bcrypt";

// Mock repository & jwt
jest.mock("@/lib/modules/auth/auth.repository");
jest.mock("@/lib/auth/jwt", () => ({
  signToken: jest.fn().mockReturnValue("mocked-jwt-token"),
}));

const mockRepo = authRepository as jest.Mocked<typeof authRepository>;

describe("authService.login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUserInDb = {
    id: "user-123",
    email: "admin@solutech.id",
    // bcrypt hash untuk "Admin@123"
    password: "$2b$10$abcdefghijklmnopqrstuvwxyz0123456789",
    name: "Admin Solutech",
    role: { name: RoleName.ADMIN },
  };

  it("should successfully log in and return token + user info", async () => {
    mockRepo.findByEmail.mockResolvedValue(mockUserInDb);
    jest.spyOn(bcrypt, "compare").mockImplementation(async () => true);

    const result = await authService.login({
      email: "admin@solutech.id",
      password: "Admin@123",
    });

    expect(result).toHaveProperty("token", "mocked-jwt-token");
    expect(result.user).toEqual({
      id: "user-123",
      email: "admin@solutech.id",
      name: "Admin Solutech",
      role: "ADMIN",
    });
    // Pastikan password tidak ikut dikembalikan
    expect(result.user).not.toHaveProperty("password");
  });

  it("should throw AppError(401) when user is not found", async () => {
    mockRepo.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({
        email: "unknown@solutech.id",
        password: "password123",
      })
    ).rejects.toThrow(AppError);

    await expect(
      authService.login({
        email: "unknown@solutech.id",
        password: "password123",
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid email or password",
    });
  });

  it("should throw AppError(401) when password does not match", async () => {
    mockRepo.findByEmail.mockResolvedValue(mockUserInDb);
    jest.spyOn(bcrypt, "compare").mockImplementation(async () => false);

    await expect(
      authService.login({
        email: "admin@solutech.id",
        password: "WrongPassword",
      })
    ).rejects.toThrow(AppError);

    await expect(
      authService.login({
        email: "admin@solutech.id",
        password: "WrongPassword",
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid email or password",
    });
  });
});
