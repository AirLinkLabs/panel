import { Router } from 'express';
import { isAuthenticated } from '../../../handlers/utils/auth/authUtil';
import { apiGet, apiPost } from '../../../handlers/internalApiClient';
import type { Module } from '../../../handlers/moduleInit';

const module: Module = {
  info: {
    name: 'User Create Server',
    version: '2.0.0',
    moduleVersion: '1.0.0',
    author: 'AirLinkLab',
    license: 'MIT',
    description: 'Create-server page and form submission',
  },
  router: () => {
    const router = Router();

    // Create server form — needs nodes, images, user limits
    // NOTE: v2 API does not yet have dedicated endpoints for nodes/images
    // for non-admin users. The old controller used direct Prisma queries.
    // This needs v2 API endpoints: GET /api/v2/nodes, GET /api/v2/images
    // For now, fallback to admin endpoints (requires admin auth) or
    // a new user-facing endpoint.
    router.get('/create-server', isAuthenticated(false), async (req, res, next) => {
      try {
        // Fetch account info + servers in parallel
        const [account, servers] = await Promise.all([
          apiGet(req, '/account').catch(() => ({})),
          apiGet(req, '/servers').catch(() => []),
        ]);

        // TODO: v2 API needs user-facing endpoints for nodes and images
        // These currently require admin access via /api/v2/admin/*
        // For now, render with available data
        res.render('user/create-server', {
          account,
          servers: Array.isArray(servers) ? servers : [],
          nodes: [],
          images: [],
          user: req.session?.user,
          req,
        });
      } catch (err) {
        next(err);
      }
    });

    // Submit create server
    router.post('/create-server', isAuthenticated(false), async (req, res, next) => {
      try {
        await apiPost(req, '/servers', req.body);
        res.redirect('/dashboard');
      } catch (err) {
        next(err);
      }
    });

    return router;
  },
};

export default module;
