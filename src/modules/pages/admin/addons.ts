import { Router } from "express";
import { isAuthenticated } from "../../../handlers/utils/auth/authUtil";
import {
  apiGet,
  apiPost,
  apiDelete,
} from "../../../handlers/internalApiClient";
import type { Module } from "../../../handlers/moduleInit";

const module: Module = {
  info: {
    name: "Admin Addons Page",
    version: "2.0.0",
    moduleVersion: "1.0.0",
    author: "AirLinkLab",
    license: "MIT",
    description: "",
  },
  router: () => {
    const router = Router();

    router.get(
      "/admin/addons",
      isAuthenticated(true, "airlink.admin.addons.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/addons");
          res.render("admin/addons/addons", {
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
      "/admin/addons/store",
      isAuthenticated(true, "airlink.admin.addons.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/addons/store");
          res.render("admin/addons/store", {
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
      "/admin/addons/store/list",
      isAuthenticated(true, "airlink.admin.addons.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/addons/store/list");
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/addons/store/:slug",
      isAuthenticated(true, "airlink.admin.addons.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/admin/addons/store/${req.params.slug}`,
          );
          res.render("admin/addons/store-details", {
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
      "/admin/addons/config",
      isAuthenticated(true, "airlink.admin.addons.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/addons/config");
          res.render("admin/addons/config", {
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
      "/admin/addons/scripts",
      isAuthenticated(true, "airlink.admin.addons.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/addons/scripts");
          res.render("admin/addons/scripts", {
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
      "/admin/addons/scripts/create",
      isAuthenticated(true, "airlink.admin.addons.view"),
      async (req, res, next) => {
        try {
          res.render("admin/addons/scripts/create", {
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/addons/scripts/edit/:id",
      isAuthenticated(true, "airlink.admin.addons.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/admin/addons/scripts/${req.params.id}`,
          );
          res.render("admin/addons/scripts/edit", {
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
      "/admin/addons/logs",
      isAuthenticated(true, "airlink.admin.addons.logs.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/addons/logs");
          res.render("admin/addons/logs", {
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
      "/admin/addons/install",
      isAuthenticated(true, "airlink.admin.addons.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/addons/install");
          res.render("admin/addons/install", {
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
      "/admin/addons",
      isAuthenticated(true, "airlink.admin.addons.install"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/addons", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/addons/install/file",
      isAuthenticated(true, "airlink.admin.addons.install"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/addons/install/file", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.delete(
      "/admin/addons/uninstall/:id",
      isAuthenticated(true, "airlink.admin.addons.uninstall"),
      async (req, res, next) => {
        try {
          await apiDelete(req, `/api/v2/admin/addons/${req.params.id}`);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/addons/:id/toggle",
      isAuthenticated(true, "airlink.admin.addons.update"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/addons/${req.params.id}/toggle`,
            req.body,
          );
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/addons/reload",
      isAuthenticated(true, "airlink.admin.addons.update"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/addons/reload", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/addons/:id/save",
      isAuthenticated(true, "airlink.admin.addons.update"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/addons/${req.params.id}/save`,
            req.body,
          );
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/addons/:id/restart",
      isAuthenticated(true, "airlink.admin.addons.update"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/addons/${req.params.id}/restart`,
            req.body,
          );
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/addons/:id/command",
      isAuthenticated(true, "airlink.admin.addons.update"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/addons/${req.params.id}/command`,
            req.body,
          );
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/addons/script/logs",
      isAuthenticated(true, "airlink.admin.addons.logs.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/addons/script/logs");
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/addons/script/logs/:id",
      isAuthenticated(true, "airlink.admin.addons.logs.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            `/api/v2/admin/addons/script/logs/${req.params.id}`,
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/addons/scripts/create",
      isAuthenticated(true, "airlink.admin.addons.scripts.create"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/addons/scripts", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/addons/scripts/update/:id",
      isAuthenticated(true, "airlink.admin.addons.scripts.update"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/addons/scripts/${req.params.id}`,
            req.body,
          );
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.delete(
      "/admin/addons/scripts/:id",
      isAuthenticated(true, "airlink.admin.addons.scripts.delete"),
      async (req, res, next) => {
        try {
          await apiDelete(req, `/api/v2/admin/addons/scripts/${req.params.id}`);
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
