import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import winston, { add } from "winston";
import { logger } from "./logger.js";
import { errorHandler, notFound } from "./middleware/error-middleware.js";
import { userRouter } from "./users/route.js";
import { userGroupRouter } from "./userGroup/route.js";
import { roleRouter } from "./role/route.js";
import { transactionLogRouter } from "./transaction-limit/route.js";
import { passwordHistoryRouter } from "./password-history/route.js";
import { maintenanceLogRouter } from "./system-maintenance/route.js";
import dotenv from "dotenv";
import { commonRouter } from "./common/route.js";
import { ENVOBJ } from "./utils/common-types.js";
import { ZodError } from "zod";
import { Role } from "./db/schema.js";

declare global {
  namespace Express {
    interface Request {
      user: { id?: string; role?: Role };
    }
  }
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(path.dirname(__filename));

const app = express();

try {
  ENVOBJ.parse(process.env);
} catch (error) {
  logger.error((error as ZodError).message);
  throw new Error((error as ZodError).message);
}

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("common", {
      stream: fs.createWriteStream(path.join(__dirname, "access.log"), {
        flags: "a",
      }),
    })
  );
}

const domains = [
  'https://20.205.146.121:3008',
  'https://rppnew.bankrakyat.com.my:3008',
  'https://rppnew.bankrakyat.com.my:3003',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  '127.0.0.1',
];
const domainsToUse =
  process.env.NODE_ENV !== "production"
    ? domains
    : domains.slice(0, domains.length - 5);

app.use(helmet());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || domainsToUse.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        return callback(
          new Error(
            "The CORS policy for this site does not allow access from the specified Origin."
          ),
          false
        );
      }
    },
  })
);

app.use(express.json());

// app.use((req, res, next) => {
//   let address =
//     (req.headers['x-forwarded-for'] as string) ||
//     req.headers.referer ||
//     req.socket.remoteAddress ||
//     '';
//   if (address.endsWith('/')) {
//     address = address.slice(0, address.length - 1);
//   }
//   if (!domainsToUse.includes(address)) {
//     return res
//       .status(401)
//       .json({ error: "you don't have the privilage to access this endpoint" });
//   }
//   next();
// });

app.get("/", async (req, res) => {
  res.json({ message: "hello" });
});

app.use("/api/common", commonRouter);
app.use("/api/users", userRouter);
app.use("/api/groups", userGroupRouter);
app.use("/api/roles", roleRouter);
app.use("/api/transactions", transactionLogRouter);
app.use("/api/maintenance", maintenanceLogRouter);
app.use("/api/password-histories", passwordHistoryRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
