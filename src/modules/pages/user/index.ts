import { Router } from "express";
import { isAuthenticated } from "../../../handlers/utils/auth/authUtil";
import { apiGet, apiPost } from "../../../handlers/internalApiClient";
import type { Module } from "../../../handlers/moduleInit";

const module: Module = {
  info: {
    name: "User Pages",
    version: "2.0.0",
    moduleVersion: "1.0.0",
    author: "AirLinkLab",
    license: "MIT",
    description: "",
  },
  router: () => {
    const router = Router();

    router.get("/dashboard", isAuthenticated(false), async (req, res, next) => {
      try {
        const data = await apiGet(req, "/api/v2/user/dashboard");
        res.render("user/dashboard", { ...data, user: req.session?.user, req });
      } catch (err) {
        next(err);
      }
    });

    router.get("/account", isAuthenticated(false), async (req, res, next) => {
      try {
        const data = await apiGet(req, "/api/v2/user/account");
        res.render("user/account", { ...data, user: req.session?.user, req });
      } catch (err) {
        next(err);
      }
    });

    router.post(
      "/account/update-email",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/user/account/email", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/account/update-password",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/user/account/password", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/account/update-image",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/user/account/image", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/account/delete-image",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/user/account/image/delete", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/account/update-discord",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/user/account/discord", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/account/update-username",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/user/account/username", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/create-server",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/user/servers/create");
          res.render("user/create-server", {
            ...data,
            user: req.session?.user,
            req,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get("/my-images", isAuthenticated(false), async (req, res, next) => {
      try {
        const data = await apiGet(req, "/api/v2/user/images");
        res.render("user/my-images", { ...data, user: req.session?.user, req });
      } catch (err) {
        next(err);
      }
    });

    router.get("/credits", isAuthenticated(false), async (req, res, next) => {
      try {
        const data = await apiGet(req, "/api/v2/user/credits");
        res.render("user/credits", { ...data, user: req.session?.user, req });
      } catch (err) {
        next(err);
      }
    });

    router.get(
      "/credits/history",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/user/credits/history");
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    router.get("/2fa", isAuthenticated(false), async (req, res, next) => {
      try {
        const data = await apiGet(req, "/api/v2/user/2fa");
        res.render("user/2fa", { ...data, user: req.session?.user, req });
      } catch (err) {
        next(err);
      }
    });

    router.post(
      "/2fa/setup",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          const result = await apiPost(req, "/api/v2/user/2fa/setup", req.body);
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/2fa/verify",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            "/api/v2/user/2fa/verify",
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/2fa/disable",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/user/2fa/disable", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get("/sftp", isAuthenticated(false), async (req, res, next) => {
      try {
        const data = await apiGet(req, "/api/v2/user/sftp");
        res.render("user/sftp", { ...data, user: req.session?.user, req });
      } catch (err) {
        next(err);
      }
    });

    router.get(
      "/sftp/create-password",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/user/sftp/create-password");
          res.json(data);
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/sftp/create-password",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          const result = await apiPost(
            req,
            "/api/v2/user/sftp/create-password",
            req.body,
          );
          res.json(result);
        } catch (err) {
          next(err);
        }
      },
    );

    router.post(
      "/sftp/delete-password",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          await apiPost(req, "/api/v2/user/sftp/delete-password", req.body);
          res.status(200).json({ success: true });
        } catch (err) {
          next(err);
        }
      },
    );

    router.get(
      "/sftp/access",
      isAuthenticated(false),
      async (req, res, next) => {
        try {
          const data = await apiGet(req, "/api/v2/user/sftp/access");
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
