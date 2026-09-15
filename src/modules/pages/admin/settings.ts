import { Router } from "express";
import { isAuthenticated } from "../../../handlers/utils/auth/authUtil";
import { apiGet, apiPost } from "../../../handlers/internalApiClient";
import type { Module } from "../../../handlers/moduleInit";

const module: Module = {
  info: {
    name: "Admin Settings Page",
    version: "2.0.0",
    moduleVersion: "1.0.0",
    author: "AirLinkLab",
    license: "MIT",
    description: "",
  },
  router: () => {
    const router = Router();

    router.get(
      "/admin/settings",
      isAuthenticated(true, "airlink.admin.settings.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/settings");
          res.render("admin/settings/settings", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/settings/update",
      isAuthenticated(true, "airlink.admin.settings.update"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/settings", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    return router;
  },
};

export default module;
