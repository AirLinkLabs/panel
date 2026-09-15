import { Router } from "express";
import { isAuthenticated } from "../../../handlers/utils/auth/authUtil";
import { apiGet, apiPost } from "../../../handlers/internalApiClient";
import type { Module } from "../../../handlers/moduleInit";

const module: Module = {
  info: {
    name: "Admin Servers Page",
    version: "2.0.0",
    moduleVersion: "1.0.0",
    author: "AirLinkLab",
    license: "MIT",
    description: "",
  },
  router: () => {
    const router = Router();

    router.get(
      "/admin/servers",
      isAuthenticated(true, "airlink.admin.servers.view"),
      async (req, res, next) => {
        try {
          const servers = await apiGet(req, "/api/v2/admin/servers");
          res.render("admin/servers/servers", {
            servers,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/servers/create",
      isAuthenticated(true, "airlink.admin.servers.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/servers/create");
          res.render("admin/servers/create", {
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
      "/admin/servers/create",
      isAuthenticated(true, "airlink.admin.servers.create"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/servers", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/servers/edit/:id",
      isAuthenticated(true, "airlink.admin.servers.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/admin/servers/${req.params.id}`,
          );
          res.render("admin/servers/edit", {
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
      "/admin/servers/edit/:id",
      isAuthenticated(true, "airlink.admin.servers.update"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/servers/${req.params.id}`,
            req.body,
          );
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/server/delete/:id",
      isAuthenticated(true, "airlink.admin.servers.delete"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/servers/${req.params.id}/delete`,
            req.body,
          );
          res.redirect("/admin/servers");
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/servers/:id/suspend",
      isAuthenticated(true, "airlink.admin.servers.update"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/servers/${req.params.id}/suspend`,
            req.body,
          );
          res.json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/servers/:id/unsuspend",
      isAuthenticated(true, "airlink.admin.servers.update"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/servers/${req.params.id}/unsuspend`,
            req.body,
          );
          res.json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/servers/:id/transfer",
      isAuthenticated(true, "airlink.admin.servers.update"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/servers/${req.params.id}/transfer`,
            req.body,
          );
          res.json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/servers/:id/transfer/status",
      isAuthenticated(true, "airlink.admin.servers.view"),
      async (req, res, next) => {
        try {
          const status = await apiGet(
            req,
            `/api/v2/admin/servers/${req.params.id}/transfer/status`,
          );
          res.json(status);
        } catch (err) {
          next(err);
        }
      },
    );

    return router;
  },
};

export default module;
