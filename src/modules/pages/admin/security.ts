import { Router } from "express";
import { isAuthenticated } from "../../../handlers/utils/auth/authUtil";
import { apiGet, apiPost } from "../../../handlers/internalApiClient";
import type { Module } from "../../../handlers/moduleInit";

const module: Module = {
  info: {
    name: "Admin Security Page",
    version: "2.0.0",
    moduleVersion: "1.0.0",
    author: "AirLinkLab",
    license: "MIT",
    description: "",
  },
  router: () => {
    const router = Router();

    router.get(
      "/admin/security",
      isAuthenticated(true, "airlink.admin.security.view"),
      async (req, res, next) => {
        try {
          res.redirect("/admin/settings");
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/security/2fa",
      isAuthenticated(true, "airlink.admin.security.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/security/2fa");
          res.render("admin/security/2fa", {
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
      "/admin/security/2fa/regenerate",
      isAuthenticated(true, "airlink.admin.security.update"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/security/2fa/regenerate", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/security/captcha",
      isAuthenticated(true, "airlink.admin.security.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/security/captcha");
          res.render("admin/security/captcha", {
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
      "/admin/security/api-access",
      isAuthenticated(true, "airlink.admin.security.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/security/api-access");
          res.render("admin/security/api-access", {
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
      "/admin/security/admin-access",
      isAuthenticated(true, "airlink.admin.security.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/security/admin-access");
          res.render("admin/security/admin-access", {
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
      "/admin/security/logins",
      isAuthenticated(true, "airlink.admin.security.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/security/logins");
          res.render("admin/security/logins", {
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
      "/admin/security/logins/recent",
      isAuthenticated(true, "airlink.admin.security.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            "/api/v2/admin/security/logins/recent",
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/security/passwords",
      isAuthenticated(true, "airlink.admin.security.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/security/passwords");
          res.render("admin/security/passwords", {
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
      "/admin/security/passwords/lookup",
      isAuthenticated(true, "airlink.admin.security.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(
            req,
            "/api/v2/admin/security/passwords/lookup",
          );
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/admin/security/registration",
      isAuthenticated(true, "airlink.admin.security.view"),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/admin/security/registration");
          res.render("admin/security/registration", {
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
      "/admin/security/2fa",
      isAuthenticated(true, "airlink.admin.security.update"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/security/2fa", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/security/captcha",
      isAuthenticated(true, "airlink.admin.security.update"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/security/captcha", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/security/api-access",
      isAuthenticated(true, "airlink.admin.security.update"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/security/api-access", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/security/admin-access",
      isAuthenticated(true, "airlink.admin.security.update"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/security/admin-access", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/security/logins",
      isAuthenticated(true, "airlink.admin.security.update"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/security/logins", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/security/registration",
      isAuthenticated(true, "airlink.admin.security.update"),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/admin/security/registration", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/admin/security/reset-2fa/:userId",
      isAuthenticated(true, "airlink.admin.security.update"),
      async (req, res, next) => {
        try {
          await apiPost(
            req,
            `/api/v2/admin/security/reset-2fa/${req.params.userId}`,
            req.body,
          );
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
