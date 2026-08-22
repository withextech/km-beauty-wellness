import { authenticate, defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/customer-verification/request",
      method: ["POST"],
      middlewares: [authenticate("customer", ["bearer"])],
    },
  ],
})
