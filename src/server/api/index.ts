import { Hono } from "hono";
import { healthRoute } from "./routes/health";

export const api = new Hono().route("/", healthRoute);

export type Api = typeof api;
