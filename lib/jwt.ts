import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET;

export function generateJWT(data: any, expiresIn: any = "1d"): string {
  if (!JWT_SECRET) throw new Error("Give Seceret Key");
  return jwt.sign(data, JWT_SECRET, {
    expiresIn: expiresIn,
  });
}
