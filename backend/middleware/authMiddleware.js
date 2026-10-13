import jwt from "jsonwebtoken";
export const authMiddleware = (req, res, next) => {
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ message: "Authentication is not configured" });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.slice(7); // Remove "Bearer " prefix
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET,{algorithms: ['HS256']});
        const userId = Number(decoded.userId);
        if (!Number.isSafeInteger(userId) || userId < 1) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        req.user = { id: userId };
        return next();
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
