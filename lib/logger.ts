import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino/file",
      options: { destination: 1 }, // stdout
    },
    formatters: {
      level: (label: string) => ({ level: label }),
    },
  }),
});

export default logger;
