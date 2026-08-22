import { authenticate, defineMiddlewares } from "@medusajs/framework/http"
import multer from "multer"

const cmsUpload = multer({ storage: multer.memoryStorage(), limits: { files: 5, fileSize: 4 * 1024 * 1024 } })

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/cms/uploads",
      method: ["POST"],
      middlewares: [cmsUpload.array("files", 5)],
    },
    {
      matcher: "/store/customer-verification/request",
      method: ["POST"],
      middlewares: [authenticate("customer", ["bearer"])],
    },
  ],
})
