import jwt from "jsonwebtoken";

export default function adminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired admin session",
    });
  }
}