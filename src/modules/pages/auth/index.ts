import { Router } from "express";
import { isAuthenticated } from "../../../handlers/utils/auth/authUtil";
import { apiGet, apiPost } from "../../../handlers/internalApiClient";
import type { Module } from "../../../handlers/moduleInit";

const module: Module = {
  info: {
    name: "Auth Pages",
    version: "2.0.0",
    moduleVersion: "1.0.0",
    author: "AirLinkLab",
    license: "MIT",
    description: "",
  },
  router: () => {
    const router = Router();

    router.get("/", (req, res, next) => {
      try {
        if (req.session?.user) {
          res.redirect("/dashboard");
          return;
        }
        res.redirect("/login");
      } catch (err) {
        next(err);
      }
    });

    router.get("/login", (req, res, next) => {
      try {
        if (req.session?.user) {
          res.redirect("/dashboard");
          return;
        }
        res.render("auth/login", { req });
      } catch (err) {
        next(err);
      }
    });

    router.get("/register", (req, res, next) => {
      try {
        if (req.session?.user) {
          res.redirect("/dashboard");
          return;
        }
        res.render("auth/register", { req });
      } catch (err) {
        next(err);
      }
    });

    router.get("/logout", isAuthenticated(), async (req, res, next) => {
      try {
        await apiPost(req, "/api/v2/auth/logout", {});
        req.session?.destroy(() => {});
        res.redirect("/login");
      } catch (err) {
        next(err);
      }
    });

    router.get("/forgot-password", (req, res, next) => {
      try {
        if (req.session?.user) {
          res.redirect("/dashboard");
          return;
        }
        res.render("auth/forgot-password", { req });
      } catch (err) {
        next(err);
      }
    });

    router.get("/reset-password", (req, res, next) => {
      try {
        if (req.session?.user) {
          res.redirect("/dashboard");
          return;
        }
        res.render("auth/reset-password", { req });
      } catch (err) {
        next(err);
      }
    });

    router.get("/reset-password/token/:token", (req, res, next) => {
      try {
        if (req.session?.user) {
          res.redirect("/dashboard");
          return;
        }
        res.render("auth/reset-password-token", {
          token: req.params.token,
          req,
        });
      } catch (err) {
        next(err);
      }
    });

    return router;
  },
};

export default module;
