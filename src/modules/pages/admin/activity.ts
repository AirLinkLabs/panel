import { Router } from "express";
import { isAuthenticated } from "../../../handlers/utils/auth/authUtil";
import { apiGet } from "../../../handlers/internalApiClient";
import type { Module } from "../../../handlers/moduleInit";

const module: Module = {
  info: {
    name: "Admin Activity Page",
    version: "2.0.0",
    moduleVersion: "1.0.0",
    author: "AirLinkLab",
    license: "MIT",
    description: "",
  },
  router: () => {
    const router = Router();

    router.get(
      "/admin/activity",
      isAuthenticated(true, "airlink.admin.activity.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/activity");
          res.render("admin/activity/activity", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/activity/logs",
      isAuthenticated(true, "airlink.admin.activity.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/activity/logs");
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    return router;
  },
};

export default module;
