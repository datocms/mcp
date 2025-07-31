import type { RequestHandler } from "express-serve-static-core";
import winston from "winston";

export const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || "info",
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.errors({ stack: true }),
		winston.format.json(),
	),
	defaultMeta: { service: "mcp-server" },
	transports: [
		new winston.transports.Console({
			format: winston.format.printf(
				({ timestamp, level, message, ...meta }) => {
					return JSON.stringify({
						time: timestamp,
						level,
						msg: message,
						...meta,
					});
				},
			),
		}),
	],
});

export const logging: RequestHandler = (req, res, next) => {
	const startTime = Date.now();
	const sessionId = req.headers["mcp-session-id"] as string | undefined;

	const originalEnd = res.end.bind(res);
	res.end = (...args: any[]) => {
		const responseTime = Date.now() - startTime;

		logger.info("Request processed", {
			method: req.method,
			url: req.url,
			sessionId: sessionId || "none",
			statusCode: res.statusCode,
			responseTime: responseTime,
			userAgent: req.headers["user-agent"],
			ip: req.ip || req.connection.remoteAddress,
			requestLength: req.headers["content-length"] || "0",
			responseLength: res.get("content-length") || "0",
		});

		return originalEnd(...args);
	};

	next();
};
