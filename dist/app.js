"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const env_1 = require("./config/env");
const logger_1 = __importDefault(require("./config/logger"));
const swagger_1 = require("./config/swagger");
const errorHandler_middleware_1 = require("./middlewares/errorHandler.middleware");
const helmet_middleware_1 = __importDefault(require("./middlewares/helmet.middleware"));
const notFoundHandler_middleware_1 = require("./middlewares/notFoundHandler.middleware");
const rateLimit_middleware_1 = require("./middlewares/rateLimit.middleware");
const request_middleware_1 = require("./middlewares/request.middleware");
const session_middleware_1 = __importDefault(require("./middlewares/session.middleware"));
const health_route_1 = __importDefault(require("./routes/health.route"));
const index_1 = __importDefault(require("./routes/index"));
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }
        const allowedOrigins = env_1.env.CORS_ORIGIN || [];
        // If no origins configured, allow all (development fallback)
        if (allowedOrigins.length === 0) {
            return callback(null, true);
        }
        // Check if the origin is in the allowed list
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // Reject origin not in allowed list
        callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    optionsSuccessStatus: 200, // Some browsers (Safari) require 200 status for OPTIONS requests
};
const REQUEST_LIMITS_OPTIONS = {
    urlencoded: { extended: false, limit: "50kb" },
    json: { limit: "50kb" },
};
const app = (0, express_1.default)();
// Trust proxy - required when behind reverse proxy (nginx, Docker, load balancer)
// Trust only the first proxy (Docker network) to prevent IP spoofing
// This allows Express to correctly identify client IPs from X-Forwarded-For headers
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(request_middleware_1.requestId);
app.use(request_middleware_1.userAgent);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((0, morgan_1.default)("combined", { stream: logger_1.default.stream }));
if ((0, env_1.isProduction)())
    app.use(rateLimit_middleware_1.generalRateLimiter);
app.use(helmet_middleware_1.default);
app.use(session_middleware_1.default);
app.use(express_1.default.urlencoded(REQUEST_LIMITS_OPTIONS.urlencoded));
app.use(express_1.default.json(REQUEST_LIMITS_OPTIONS.json));
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.static(node_path_1.default.join(__dirname, "public")));
app.get("/api-docs/swagger.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(swagger_1.swaggerSpec);
});
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, swagger_1.swaggerUiOptions));
// Health check at root level (for load balancers, monitoring tools)
app.use("/", health_route_1.default);
// API routes
app.use(env_1.env.API_PREFIX, index_1.default);
app.use(notFoundHandler_middleware_1.notFoundHandler);
app.use(errorHandler_middleware_1.errorHandler);
exports.default = app;
