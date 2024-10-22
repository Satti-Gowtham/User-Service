import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as db from "../db";

const router = express.Router();

router.post("/register", async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  // Input validation
  if (!username || !email || !password) {
    res
      .status(400)
      .json({ message: "Username, email, and password are required" });
    return;
  }

  if (
    typeof username !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    res.status(400).json({ message: "Invalid input types" });
    return;
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    res.status(400).json({ message: "Invalid email format" });
    return;
  }

  // Password strength validation
  if (password.length < 8) {
    res
      .status(400)
      .json({ message: "Password must be at least 8 characters long" });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await db.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id",
      [username, email, hashedPassword]
    );
    
    res.status(201).json({
      message: "User registered successfully",
      userId: result.rows[0].id,
    });
  } catch (error) {
    if ((error as any).code === "23505") {
      // Unique constraint violation
      res.status(409).json({ message: "Username or email already exists" });
    } else {
      res.status(500).json({
        message: "Error registering user",
        error: (error as Error).message,
      });
    }
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    res.status(400).json({ message: "Username and password are required" });
    return;
  }

  if (typeof username !== "string" || typeof password !== "string") {
    res.status(400).json({ message: "Invalid input types" });
    return;
  }

  try {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (isValidPassword) {
        const token = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET as string,
          { expiresIn: "1h" }
        );
        res.json({ message: "Login successful", token });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error logging in", error: (error as Error).message });
  }
});

export default router;
