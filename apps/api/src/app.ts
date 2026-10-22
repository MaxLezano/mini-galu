import { createHmac } from "node:crypto";
import { relative } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { serveStatic } from "@hono/node-server/serve-static";
import {
  CatalogQuerySchema,
  deliverySummary,
  formatARS,
  freeShippingFrom,
  GIFTCARD_MAX_CENTS,
  GIFTCARD_MIN_CENTS,
  type OrderStatus,
  pickupHoursLabel,
  trackingPath,
  whatsappUrl,
  workshopPlace,
} from "@mini-galu/contracts";
import { createDb, eq, schema } from "@mini-galu/db";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { AssistantAdminService } from "./assistant/application/assistant-admin-service";
import { AssistantService } from "./assistant/application/assistant-service";
import type { AssistantCatalog, LlmProvider } from "./assistant/application/ports";
import { assistantTools } from "./assistant/application/tools";
import { ClaudeProvider } from "./assistant/infrastructure/claude-provider";
import {
  DrizzleAssistantSettings,
  DrizzleConversationLog,
  DrizzleFacts,
} from "./assistant/infrastructure/drizzle-assistant";
import { adminAssistantRoutes } from "./assistant/infrastructure/http/admin-assistant-routes";
import { assistantRoutes } from "./assistant/infrastructure/http/assistant-routes";
import { OllamaProvider } from "./assistant/infrastructure/ollama-provider";
import { createAuth } from "./auth/infrastructure/better-auth";
import { authRoutes, requireAdmin } from "./auth/infrastructure/http/auth-routes";
import { AutomationService } from "./automations/application/automation-service";
import {
  DrizzleAutomationOrders,
  DrizzleAutomationSettings,
  DrizzleBirthdays,
  DrizzleIdleCarts,
  DrizzleLaunchSignups,
  DrizzleLowStock,
  DrizzleRunLog,
  DrizzleWaitlist,
} from "./automations/infrastructure/drizzle-automations";
import { adminAutomationRoutes } from "./automations/infrastructure/http/automation-routes";
import { CartService } from "./cart/application/cart-service";
import { DrizzleCartRepository, DrizzleVariantCatalog } from "./cart/infrastructure/drizzle-cart-repository";
import { cartOwner } from "./cart/infrastructure/http/cart-owner";
import { cartRoutes } from "./cart/infrastructure/http/cart-routes";
import { AdminCatalogService } from "./catalog/application/admin-catalog-service";
import { CatalogService } from "./catalog/application/catalog-service";
import { DrizzleAdminProductRepository } from "./catalog/infrastructure/drizzle-admin-product-repository";
import {
  DrizzleProductRepository,
  DrizzleWaitlistRepository,
} from "./catalog/infrastructure/drizzle-product-repository";
import { adminCatalogRoutes } from "./catalog/infrastructure/http/admin-catalog-routes";
import { catalogRoutes } from "./catalog/infrastructure/http/catalog-routes";
import type { Config } from "./config";
import { AdminLaunchesService } from "./content/application/admin-launches-service";
import { ContentService } from "./content/application/content-service";
import { HelpService } from "./content/application/help-service";
import type { ProductPublisher } from "./content/application/launch-ports";
import { LaunchVisitsService } from "./content/application/launch-visits-service";
import { helpValues } from "./content/domain/help";
import { DrizzleAdminLaunchRepository } from "./content/infrastructure/drizzle-admin-launch-repository";
import { DrizzleContentRepository } from "./content/infrastructure/drizzle-content-repository";
import { DrizzleHelpRepository } from "./content/infrastructure/drizzle-help-repository";
import { DrizzleLaunchMetrics } from "./content/infrastructure/drizzle-launch-metrics";
import { DrizzleLaunchVisits } from "./content/infrastructure/drizzle-launch-visits";
import { adminHomeRoutes } from "./content/infrastructure/http/admin-home-routes";
import { adminLaunchesRoutes } from "./content/infrastructure/http/admin-launches-routes";
import { contentRoutes } from "./content/infrastructure/http/content-routes";
import { adminHelpRoutes, helpRoutes } from "./content/infrastructure/http/help-routes";
import { CouponService } from "./coupons/application/coupon-service";
import { DrizzleCouponRepository } from "./coupons/infrastructure/drizzle-coupon-repository";
import { adminCouponRoutes } from "./coupons/infrastructure/http/admin-coupon-routes";
import { AdminCustomersService } from "./customers/application/admin-customers-service";
import { CustomerService } from "./customers/application/customer-service";
import { DrizzleAdminCustomers } from "./customers/infrastructure/drizzle-admin-customers";
import { DrizzleCustomerOrders, DrizzleCustomers } from "./customers/infrastructure/drizzle-customers";
import { accountRoutes, wishlistRoutes } from "./customers/infrastructure/http/account-routes";
import { adminCustomerRoutes } from "./customers/infrastructure/http/admin-customer-routes";
import { GiftcardService } from "./giftcards/application/giftcard-service";
import type { GiftcardRecord } from "./giftcards/application/ports";
import { DrizzleGiftcards } from "./giftcards/infrastructure/drizzle-giftcards";
import { adminGiftcardRoutes, giftcardRoutes } from "./giftcards/infrastructure/http/giftcard-routes";
import { InvoiceService } from "./invoicing/application/invoice-service";
import type { InvoiceIssuer } from "./invoicing/application/ports";
import { type InvoiceLine, paymentLabel } from "./invoicing/domain/invoice";
import { ArcaIssuer } from "./invoicing/infrastructure/arca/arca-issuer";
import { Wsaa } from "./invoicing/infrastructure/arca/wsaa";
import { DrizzleArcaTickets, DrizzleInvoices } from "./invoicing/infrastructure/drizzle-invoices";
import { adminInvoiceRoutes } from "./invoicing/infrastructure/http/invoice-routes";
import { PdfInvoiceRenderer } from "./invoicing/infrastructure/pdf-invoice-renderer";
import { NoIssuer, SimulatedIssuer } from "./invoicing/infrastructure/simulated-issuer";
import { NewsletterService } from "./newsletter/application/newsletter-service";
import { DrizzleLetters, DrizzleSubscribers } from "./newsletter/infrastructure/drizzle-newsletter";
import { adminNewsletterRoutes, newsletterRoutes } from "./newsletter/infrastructure/http/newsletter-routes";
import { OrderNotifications } from "./notifications/application/order-notifications";
import { withReplyTo } from "./notifications/application/ports";
import { untilLabel } from "./notifications/domain/mail";
import { ResendMailer } from "./notifications/infrastructure/resend-mailer";
import { SmtpMailer } from "./notifications/infrastructure/smtp-mailer";
import { AdminOrdersService } from "./orders/application/admin-orders-service";
import { CheckoutService } from "./orders/application/checkout-service";
import { OrderPayments } from "./orders/application/order-payments";
import { OrderRefunds } from "./orders/application/order-refunds";
import { OrderShipping } from "./orders/application/order-shipping";
import { PaymentLinks } from "./orders/application/payment-links";
import { Revocations } from "./orders/application/revocations";
import { SizeExchanges } from "./orders/application/size-exchanges";
import { formatOrderNumber, parseOrderNumber, payPath } from "./orders/domain/order";
import { DrizzleOrderRepository, DrizzleRevocations } from "./orders/infrastructure/drizzle-order-repository";
import { adminOrderRoutes } from "./orders/infrastructure/http/admin-order-routes";
import { checkoutRoutes } from "./orders/infrastructure/http/checkout-routes";
import { revocationRoutes } from "./orders/infrastructure/http/revocation-routes";
import { PaymentService } from "./payments/application/payment-service";
import type { PaymentGateway } from "./payments/application/ports";
import { RefundService } from "./payments/application/refund-service";
import { DrizzlePaymentRepository, DrizzlePaymentSettings } from "./payments/infrastructure/drizzle-payments";
import {
  adminPaymentRoutes,
  adminRefundRoutes,
  checkoutPaymentRoutes,
  webhookRoutes,
} from "./payments/infrastructure/http/payment-routes";
import { MercadoPagoGateway } from "./payments/infrastructure/mercadopago-gateway";
import { SimulatedGateway } from "./payments/infrastructure/simulated-gateway";
import { PointsService } from "./points/application/points-service";
import { DrizzlePoints } from "./points/infrastructure/drizzle-points";
import { PoliciesService } from "./policies/application/policies-service";
import { DrizzlePoliciesStore } from "./policies/infrastructure/drizzle-policies-store";
import { adminPoliciesRoutes, policiesRoutes } from "./policies/infrastructure/http/policies-routes";
import { ReviewService } from "./reviews/application/review-service";
import { reviewPath } from "./reviews/domain/review";
import { DrizzleReviews } from "./reviews/infrastructure/drizzle-reviews";
import { adminReviewRoutes, reviewRoutes } from "./reviews/infrastructure/http/review-routes";
import { NotFoundError } from "./shared/domain/errors";
import { EventBus } from "./shared/events/event-bus";
import { onError } from "./shared/http/errors";
import { limitByIp, RateLimiter } from "./shared/http/rate-limit";
import { LocalDiskImageStorage } from "./shared/media/image-storage";
import { mediaVariantsOnDemand } from "./shared/media/media-variants";
import { ResponsiveImageStorage } from "./shared/media/responsive-image-storage";
import { S3ImageStorage } from "./shared/media/s3-image-storage";
import { SharpCropper, SharpResizer } from "./shared/media/sharp-resizer";
import { IntervalScheduler } from "./shared/scheduler/interval-scheduler";
import { ShipmentService } from "./shipping/application/shipment-service";
import { ShippingService } from "./shipping/application/shipping-service";
import { slotLabel } from "./shipping/domain/pickup";
import { AndreaniClient } from "./shipping/infrastructure/andreani/andreani-client";
import { AndreaniGateway, AndreaniRates } from "./shipping/infrastructure/andreani/andreani-gateway";
import { AndreaniBranches, FakeBranches } from "./shipping/infrastructure/andreani-branches";
import { DrizzleShipmentRepository } from "./shipping/infrastructure/drizzle-shipment-repository";
import { DrizzleShippingSettings } from "./shipping/infrastructure/drizzle-shipping-settings";
import { FakeAndreani } from "./shipping/infrastructure/fake-andreani";
import {
  adminShipmentRoutes,
  adminShippingRoutes,
  trackingRoutes,
} from "./shipping/infrastructure/http/shipment-routes";
import { PdfLibMerger } from "./shipping/infrastructure/pdf-lib-merger";
import { NoAndreaniRates, SimulatedAndreaniRates } from "./shipping/infrastructure/simulated-andreani-rates";
import { SubscribersService } from "./subscribers/application/subscribers-service";
import { DrizzleSubscribersReadModel } from "./subscribers/infrastructure/drizzle-subscribers";
import { adminSubscribersRoutes } from "./subscribers/infrastructure/http/subscribers-routes";

/** Composition root: acá (y solo acá) se eligen los adapters de cada puerto. */
export function buildApp(config: Config) {
  const db = createDb(config.databaseUrl);
  const disk = new LocalDiskImageStorage(config.publicUrl, config.mediaDir);
  const resizer = new SharpResizer();
  // con bucket (producción) las fotos van a R2/S3; si no, al disco y las sirve /media
  const storage = new ResponsiveImageStorage(config.s3 ? new S3ImageStorage(config.s3) : disk, resizer);
  const events = new EventBus();
  const auth = createAuth(db, {
    publicUrl: config.publicUrl,
    webOrigin: config.webOrigin,
    secret: config.authSecret,
    secureCookies: config.env === "production",
    cookieDomain: config.cookieDomain,
    rateLimit: config.env === "production",
    google: config.google,
    onSignUp: async (u) => {
      if (u.newsletterOptIn) await newsletter.subscribe(u.email, "registro");
    },
    mail: {
      resetPassword: (to, name, url) =>
        notifications.message({
          to,
          subject: "Creá una contraseña nueva",
          eyebrow: "Tu cuenta",
          name: name || null,
          body: "Nos pediste cambiar la contraseña de tu cuenta de Mini Galú. El link vale 1 hora. Si no fuiste vos, ignorá este mail: tu contraseña sigue igual.",
          cta: { label: "Crear contraseña nueva", url },
          number: null,
        }),
      verifyEmail: (to, name, url) =>
        notifications.message({
          to,
          subject: "Confirmá tu mail",
          eyebrow: "Tu cuenta",
          name: name || null,
          body: "¡Gracias por crear tu cuenta! Confirmá tu mail para recibir los avisos de tus pedidos y de los talles que vuelven.",
          cta: { label: "Confirmar mi mail", url },
          number: null,
        }),
    },
    // se bloqueó una cuenta por intentos fallidos: si existe, se le avisa (la respuesta al navegador es la misma)
    onLoginLocked: async (email) => {
      const [u] = await db
        .select({ email: schema.user.email, firstName: schema.user.firstName })
        .from(schema.user)
        .where(eq(schema.user.email, email.trim().toLowerCase()));
      if (!u) return;
      await notifications.message({
        to: u.email,
        subject: "Bloqueamos el ingreso a tu cuenta por 15 minutos",
        eyebrow: "Seguridad de tu cuenta",
        name: u.firstName || null,
        body: "Hubo varios intentos fallidos de ingresar con tu email, así que pausamos el ingreso por 15 minutos. Si fuiste vos, esperá y probá de nuevo. Si no fuiste vos, cambiá la contraseña y activá la verificación en dos pasos.",
        cta: null,
        number: null,
      });
    },
  });

  const catalog = new CatalogService(new DrizzleProductRepository(db), new DrizzleWaitlistRepository(db), storage);
  const adminCatalog = new AdminCatalogService(
    new DrizzleAdminProductRepository(db),
    storage,
    events,
    new SharpCropper(),
  );
  const content = new ContentService(new DrizzleContentRepository(db), catalog, storage);
  // ajustes de "Tienda y pagos" (cambios, envíos, retiro, gift cards, contacto y taller): los leen envíos, ayuda,
  // gift cards, Galú y los mails, así lo que cambia Gaby se ve igual en todos lados
  const policies = new PoliciesService(new DrizzlePoliciesStore(db), config.arca?.cuit ?? null);
  const workshop = async () => workshopPlace((await policies.get()).workshop);
  const help = new HelpService(new DrizzleHelpRepository(db), async () => ({ policies: await policies.get() }));

  // los lanzamientos publican prendas a través del catálogo (que valida, por ejemplo, que tengan foto)
  const publisher: ProductPublisher = {
    async publish(slugs) {
      const published: string[] = [];
      const skipped: { slug: string; reason: string }[] = [];
      for (const slug of slugs) {
        try {
          await adminCatalog.setStatus(slug, "published");
          published.push(slug);
        } catch (e) {
          skipped.push({ slug, reason: e instanceof Error ? e.message : "error" });
        }
      }
      return { published, skipped };
    },
  };
  const launches = new AdminLaunchesService(
    new DrizzleAdminLaunchRepository(db),
    publisher,
    storage,
    events,
    new DrizzleLaunchMetrics(db),
  );
  // visitas al adelanto: el visitante es un hash con el secreto del servidor (no se guarda IP ni cookie)
  const launchVisits = new LaunchVisitsService(new DrizzleLaunchVisits(db), (v) =>
    createHmac("sha256", config.authSecret).update(v).digest("base64url"),
  );

  // checkout: bolsa → pedido (reserva stock) → pago
  const orders = new DrizzleOrderRepository(db);
  const variants = new DrizzleVariantCatalog(db);
  // Andreani de verdad si están las credenciales en el .env; si no, simulado en local y CI, y en producción no se
  // ofrece (quedan envío a acordar, cadete y retiro): nunca un precio inventado
  const shippingSettings = new DrizzleShippingSettings(db);
  const andreani = config.andreani ? new AndreaniClient(config.andreani) : null;
  const shipping = new ShippingService(
    andreani && config.andreani
      ? new AndreaniRates(andreani, config.andreani, shippingSettings)
      : config.env === "production"
        ? new NoAndreaniRates()
        : new SimulatedAndreaniRates(),
    undefined,
    config.branches === "andreani" ? new AndreaniBranches() : new FakeBranches(),
    policies,
  );
  const cart = new CartService(new DrizzleCartRepository(db), variants, storage, orders);
  const coupons = new CouponService(new DrizzleCouponRepository(db));
  // puntos por reseñas: suman al publicarlas y se canjean por un cupón personal (reglas en "Tienda y pagos")
  const points = new PointsService(
    new DrizzlePoints(db),
    { issue: (p) => coupons.issuePersonal(p) },
    async () => (await policies.get()).reviewPoints,
    events,
  );
  const reviews = new ReviewService(
    new DrizzleReviews(db, formatOrderNumber, parseOrderNumber),
    storage,
    resizer,
    async (email) => {
      const s = await points.summary(email);
      return s.rules.enabled ? { rules: s.rules, balance: s.balance } : null;
    },
    events,
  );
  // las gift cards se arman más abajo (necesitan los mails); el checkout las usa recién al cotizar o comprar
  const checkout: CheckoutService = new CheckoutService(
    cart,
    shipping,
    coupons,
    orders,
    storage,
    {
      check: (code) => giftcards.check(code),
      checkById: (id) => giftcards.checkById(id),
      summary: (orderId) => giftcards.summary(orderId),
      redeem: (orderId, id, cents) => giftcards.redeem(orderId, id, cents),
    },
    (orderId) => orderPayments.approved(orderId, { method: "giftcard", installments: 1 }),
  );
  const orderPayments = new OrderPayments(orders, cart, coupons, events);
  const orderRefunds = new OrderRefunds(
    orders,
    {
      purchasedUsed: (orderId) => giftcards.purchasedUsed(orderId),
      annulPurchased: (orderId) => giftcards.annulPurchased(orderId),
      reactivatePurchased: (orderId) => giftcards.reactivatePurchased(orderId),
      restoreRedeemed: (orderId, cents) => giftcards.restoreRedeemed(orderId, cents),
    },
    events,
  );
  const sizeExchanges = new SizeExchanges(orders, events);
  const adminOrders = new AdminOrdersService(
    orders,
    storage,
    events,
    slotLabel,
    (number, token) => config.webOrigin + payPath(number, token),
    undefined,
    orderRefunds,
    (p) => payments.netReceived(p.provider, p.reference),
    (number, token) => config.webOrigin + reviewPath(number, token),
    (orderId) => invoicing.forOrder(orderId),
    sizeExchanges,
  );
  const paymentLinks = new PaymentLinks(
    variants,
    shipping,
    orders,
    events,
    config.webOrigin,
    () => automations.isOn("link_sin_pagar"),
    undefined,
    undefined,
    {
      check: (code) => giftcards.check(code),
      checkById: (id) => giftcards.checkById(id),
      summary: async () => null,
      redeem: (orderId, id, cents) => giftcards.redeem(orderId, id, cents),
    },
    (orderId, method) => orderPayments.approved(orderId, { method, installments: 1 }),
  );
  const shipments = new ShipmentService(
    andreani && config.andreani
      ? new AndreaniGateway(andreani, config.andreani)
      : new FakeAndreani(undefined, config.fakeAndreaniSpeed),
    new DrizzleShipmentRepository(db),
    new OrderShipping(orders, storage, events, workshop),
    (number, token) => config.webOrigin + payPath(number, token),
    shippingSettings,
    config.branches,
    new PdfLibMerger(),
  );
  const webhookUrl = `${config.publicUrl}/payments/webhook`;
  const gateway: PaymentGateway = config.mercadoPago
    ? new MercadoPagoGateway({
        ...config.mercadoPago,
        notificationUrl: webhookUrl.startsWith("https://") ? webhookUrl : null,
      })
    : new SimulatedGateway();
  const paymentRepository = new DrizzlePaymentRepository(db);
  const refunds = new RefundService(gateway, paymentRepository, orderRefunds);
  const payments = new PaymentService(
    gateway,
    paymentRepository,
    new DrizzlePaymentSettings(db),
    orderPayments,
    events,
    { web: config.webOrigin, webhook: webhookUrl },
  );
  const secure = config.env === "production";

  // TODO(fase 6 · automations): avisar a los anotados que ya salió (y 1 hora antes si notifyBefore)
  events.on("LaunchPublished", (e) => console.info("[eventos] Lanzamiento publicado:", JSON.stringify(e.payload)));
  // "Recibimos tu pago" por mail (el resto de los avisos y WhatsApp llegan con las automatizaciones, fase 6)
  const notifications: OrderNotifications = new OrderNotifications(
    {
      async find(orderId) {
        const o = await orders.findById(orderId);
        if (!o) return null;
        const r = checkout.toReceipt(o);
        const a = o.shippingAddress;
        return {
          number: r.number,
          accessToken: o.accessToken,
          firstName: o.firstName,
          email: o.email,
          items: r.items,
          subtotalCents: o.subtotalCents,
          discountCents: o.discountCents,
          shippingCents: o.shippingCents,
          totalCents: o.totalCents,
          couponCode: o.couponCode,
          shippingMethod: o.shippingMethod,
          shippingAddress: a
            ? `${a.street} ${a.number}${a.unit ? `, ${a.unit}` : ""} · ${a.city}, ${a.province} (${a.postalCode})`
            : null,
          pickupLabel: o.pickupSlot ? slotLabel(o.pickupSlot) : null,
          branchLabel: r.branchLabel,
          paymentMethod: o.paymentMethod,
          installments: o.installments,
          inPerson: o.channel === "taller",
        };
      },
    },
    withReplyTo(
      config.mail.kind === "resend" ? new ResendMailer(config.mail) : new SmtpMailer(config.mail),
      async () => (await policies.get()).contact.email,
    ),
    async (number, token) => {
      const p = await policies.get();
      return {
        tracking: `${config.webOrigin}${trackingPath(number, token)}`,
        whatsapp: whatsappUrl(p.contact.whatsapp),
        site: config.webOrigin,
        workshop: p.workshop.city,
        exchangeDays: p.exchangeDays,
      };
    },
    (orderId) => invoicing.attachment(orderId, "factura"),
  );

  // factura electrónica: ARCA con el certificado de Gaby; sin él, simulada en local y CI y, en producción, ninguna
  // (los pedidos quedan sin facturar y el panel lo avisa): nunca un CAE inventado
  const invoiceRepo = new DrizzleInvoices(db, formatOrderNumber);
  const issuer: InvoiceIssuer = config.arca
    ? new ArcaIssuer(config.arca, new Wsaa(config.arca, new DrizzleArcaTickets(db)))
    : config.env === "production"
      ? new NoIssuer()
      : new SimulatedIssuer((type, pointOfSale) => invoiceRepo.maxNumber(true, type, pointOfSale));
  const invoiceOrder = (o: Awaited<ReturnType<typeof orders.findById>>) =>
    o && {
      id: o.id,
      number: formatOrderNumber(o.number),
      kind: o.kind,
      firstName: o.firstName,
      lastName: o.lastName,
      email: o.email,
      items: o.items.map((i) => ({ name: i.name, size: i.size, qty: i.qty, unitPriceCents: i.unitPriceCents })),
      discountCents: o.discountCents,
      couponCode: o.couponCode,
      shippingCents: o.shippingCents,
      totalCents: o.totalCents,
      giftcardCents: o.giftcardCents,
      payment: paymentLabel({ method: o.paymentMethod, installments: o.installments, giftcardCents: o.giftcardCents }),
    };
  const invoicing: InvoiceService = new InvoiceService(
    issuer,
    invoiceRepo,
    {
      find: async (orderId) => invoiceOrder(await orders.findById(orderId)),
      async findByNumber(number) {
        const n = parseOrderNumber(number);
        return n ? invoiceOrder(await orders.findByNumber(n)) : null;
      },
      log: (orderId, title, detail) => orders.addEvent(orderId, { kind: "invoice", title, detail, auto: true }),
    },
    new PdfInvoiceRenderer(),
    {
      send: (o, kind, attachment) =>
        notifications.message(
          {
            to: o.email,
            subject:
              kind === "factura" ? `Tu factura del pedido #${o.number}` : `Nota de crédito del pedido #${o.number}`,
            eyebrow: `Pedido #${o.number} · ${kind === "factura" ? "factura" : "nota de crédito"}`,
            name: o.firstName || null,
            body:
              kind === "factura"
                ? "Te adjuntamos la factura de tu compra. Guardala: te sirve si necesitás cambiar un talle."
                : "Te adjuntamos la nota de crédito que anula la factura del pedido que te reintegramos.",
            cta: null,
            number: o.number,
          },
          [attachment],
        ),
    },
    async () => (await policies.get()).fiscal,
  );
  const newsletter = new NewsletterService(
    new DrizzleSubscribers(db),
    new DrizzleLetters(db),
    notifications,
    (t) => `${config.webOrigin}/cartas/baja?t=${encodeURIComponent(t)}`,
  );
  const giftcards: GiftcardService = new GiftcardService(
    new DrizzleGiftcards(db),
    {
      create: (o) => checkout.placeGiftcard(o.buyer, o.amountCents),
      async close(orderId) {
        if (await orders.setStatus(orderId, "nuevo", "entregado", new Date()))
          await orders.addEvent(orderId, {
            kind: "status",
            title: "Gift card activada",
            detail: "No hay prendas que preparar",
            auto: true,
            toStatus: "entregado",
          });
      },
      log: (orderId, title, detail) => orders.addEvent(orderId, { kind: "giftcard", title, detail, auto: true }),
      async find(orderId) {
        const o = await orders.findById(orderId);
        return o
          ? {
              kind: o.kind,
              email: o.email,
              firstName: o.firstName,
              giftcardId: o.giftcardId ?? null,
              giftcardCents: o.giftcardCents,
            }
          : null;
      },
    },
    {
      toRecipient: (to, c) => notifications.giftcard(to, giftcardMailData(c)),
      toBuyer: (to, c) =>
        notifications.giftcardBuyer(to, giftcardMailData(c), {
          via: c.via,
          recipient: c.recipient,
          when: c.deliverAt && c.deliverAt > new Date() ? longDay(c.deliverAt) : null,
          whatsappUrl:
            c.via === "whatsapp"
              ? `https://wa.me/${c.recipient.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `¡Hola! ${c.fromName} te regaló una gift card de Mini Galú para ${c.toName} ♡ Código: ${c.code} · se usa en ${config.webOrigin}/catalogo`,
                )}`
              : null,
        }),
    },
    async () => (await policies.get()).giftcardMonths,
  );
  const customers = new CustomerService(
    new DrizzleCustomers(db, storage),
    new DrizzleCustomerOrders(db, storage, formatOrderNumber, reviewPath),
    newsletter,
    giftcards,
    undefined,
    undefined,
    events,
    { forEmail: (email) => points.summary(email), redeem: (email) => points.redeem(email) },
  );
  // automatizaciones: cada regla se puede pausar y editar desde el panel (admin-automatizaciones.html)
  const automations = new AutomationService(
    new DrizzleAutomationSettings(db),
    new DrizzleRunLog(db),
    notifications,
    new DrizzleAutomationOrders(db, slotLabel, formatOrderNumber, async () => (await policies.get()).reviewPoints),
    new DrizzleWaitlist(db),
    new DrizzleLowStock(db),
    new DrizzleBirthdays(db, () => coupons.birthdayCoupon()),
    // ideas para el cumple: las prendas (sin accesorios) más vendidas con stock en el talle
    {
      inSize: async (size, limit) =>
        (await catalog.list(CatalogQuerySchema.parse({ talle: size, sort: "pop" })))
          .filter((p) => !p.isAccessory)
          .slice(0, limit)
          .map((p) => ({
            name: p.name,
            priceCents: p.priceCents,
            imageUrl: p.images[0]?.url ?? "",
            url: `${config.webOrigin}/producto/${p.slug}`,
          })),
    },
    new DrizzleIdleCarts(
      db,
      (path) => storage.url(path),
      (slug) => `${config.webOrigin}/producto/${slug}`,
    ),
    new DrizzleLaunchSignups(
      db,
      (path) => storage.url(path),
      (slug) => `${config.webOrigin}/producto/${slug}`,
    ),
    {
      launch: `${config.webOrigin}/#lanzamiento`,
      tracking: (n, t) => `${config.webOrigin}${trackingPath(n, t)}`,
      product: (slug) => `${config.webOrigin}/producto/${slug}`,
      catalog: (size) => `${config.webOrigin}/catalogo?talle=${encodeURIComponent(size)}`,
      // con sesión, ingresar pasa directo al checkout con la bolsa de la cuenta
      bag: `${config.webOrigin}/ingresar?volver=%2Fcheckout`,
      site: config.webOrigin,
      workshop,
      review: (n, t) => `${config.webOrigin}${reviewPath(n, t)}`,
      // sin sesión, ingresar vuelve a la pestaña Puntos de Mi cuenta
      points: `${config.webOrigin}/ingresar?volver=%2Fcuenta%23puntos`,
    },
  );
  // la compra de una gift card no lleva los avisos de un pedido de prendas: le llega su código
  const prendas = (e: { payload: Record<string, unknown> }) => e.payload.kind !== "giftcard";
  // la factura se pide antes del "Recibimos tu pago" para que salga adjunta; si ARCA tarda o falla, se reintenta y
  // le llega sola cuando se emite (también si el mail de confirmación está pausado)
  events.on("PaymentApproved", async (e) => {
    const orderId = String(e.payload.orderId);
    await invoicing.paymentApproved(orderId).catch((err) => console.error("[facturas] pago aprobado:", err));
    if (prendas(e)) await automations.paymentApproved(orderId);
    await invoicing.mailPending(orderId);
  });
  // lista de cumple: lo que se regaló con este pedido queda marcado
  events.on("PaymentApproved", (e) =>
    prendas(e) ? customers.wishGifted(String(e.payload.orderId)).then(() => {}) : undefined,
  );
  // gift cards: se activa la que se compró o se descuenta la que se usó
  events.on("PaymentApproved", (e) => giftcards.paymentApproved(String(e.payload.orderId)));
  // venta en el taller: pagada, se la llevó en el momento
  events.on("PaymentApproved", (e) => paymentLinks.handedOver(String(e.payload.orderId)));
  events.on("OrderStatusChanged", (e) =>
    automations.statusChanged(String(e.payload.orderId), e.payload.to as OrderStatus),
  );
  events.on("ReviewPublished", (e) => points.reviewPublished(String(e.payload.reviewId)).then(() => {}));
  events.on("PointsEarned", (e) =>
    automations.pointsEarned(e.payload as { reviewId: string; points: number; balance: number }),
  );
  // "Mis nenas": una nena cargada con el cumple cerca recibe el aviso sin esperar al programador
  events.on("ChildSaved", () => automations.birthdays({ anyHour: true }).then(() => {}));
  events.on("StockReplenished", (e) =>
    automations.replenished(e.payload as { productId: string; slug: string; name: string; sizes: { size: string }[] }),
  );
  events.on("PaymentLinkReminder", (e) => {
    const p = e.payload;
    return automations.linkReminder({
      orderId: String(p.orderId),
      number: String(p.number),
      firstName: String(p.firstName),
      email: String(p.email),
      totalCents: Number(p.totalCents),
      payUrl: String(p.payUrl),
      reservedUntilLabel: p.reservedUntil ? untilLabel(new Date(String(p.reservedUntil))) : null,
    });
  });
  // botón de arrepentimiento: el código le llega al cliente por mail y el taller se entera para devolver la plata
  const revocations = new Revocations(orders, new DrizzleRevocations(db), events);
  events.on("RevocationRequested", async (e) => {
    const p = e.payload as {
      number: string;
      code: string;
      email: string;
      firstName: string;
      customer: string;
      inTime: boolean;
      reason: string | null;
    };
    await notifications.message({
      to: p.email,
      subject: `Recibimos tu pedido de baja · ${p.code}`,
      eyebrow: `Pedido #${p.number} · arrepentimiento`,
      name: p.firstName || null,
      body: `Registramos tu pedido de baja del pedido #${p.number}. El código de tu solicitud es ${p.code}: guardalo para cualquier consulta. Te escribimos en estos días para coordinar la devolución de las prendas (si ya las recibiste) y del dinero, que vuelve por el mismo medio con el que pagaste.`,
      cta: null,
      number: p.number,
    });
    await notifications.message({
      to: (await policies.get()).contact.email,
      subject: `Arrepentimiento · #${p.number} · ${p.code}`,
      eyebrow: "Botón de arrepentimiento",
      name: null,
      body: `${p.customer} (${p.email}) pidió la baja del pedido #${p.number} con el código ${p.code}.${
        p.inTime ? "" : " Ojo: pasaron más de 10 días desde la entrega."
      }${p.reason ? ` Motivo: "${p.reason}".` : ""} Escribile para coordinar la devolución y el reintegro.`,
      cta: { label: "Ver el pedido", url: `${config.webOrigin}/taller/pedidos?pedido=${encodeURIComponent(p.number)}` },
      number: p.number,
    });
  });
  events.on("OrderExpired", (e) => console.info("[eventos] Reserva vencida:", JSON.stringify(e.payload)));
  // reintegro desde el panel: el cliente se entera por mail de cuánto vuelve y por dónde
  events.on("OrderRefunded", async (e) => {
    const p = e.payload as {
      orderId: string;
      number: string;
      cents: number;
      cash: boolean;
      giftcardCents: number;
      pending: boolean;
      /** Hubo devoluciones parciales antes: la nota de crédito lleva lo que quedaba. */
      lines: InvoiceLine[] | null;
    };
    const o = await orders.findById(p.orderId);
    if (!o) return;
    // la factura se anula con una nota de crédito, que va adjunta al aviso
    await invoicing.refunded(p.orderId, p.lines).catch((err) => console.error("[facturas] reintegro:", err));
    const creditNote = await invoicing.attachment(p.orderId, "nota_credito");
    const parts = [
      p.cents > 0
        ? `${formatARS(p.cents)} ${p.cash ? "en efectivo, en el taller" : "por el mismo medio con el que pagaste"}`
        : null,
      p.giftcardCents > 0 ? `${formatARS(p.giftcardCents)} al saldo de tu gift card` : null,
    ].filter(Boolean);
    await notifications.message(
      {
        to: o.email,
        subject: `Te devolvimos el dinero del pedido #${p.number}`,
        eyebrow: `Pedido #${p.number} · reintegro`,
        name: o.firstName || null,
        body: `Reintegramos el pedido #${p.number}: ${parts.join(" y ") || "no había nada que devolver"}.${
          p.cents > 0 && !p.cash
            ? p.pending
              ? " Mercado Pago lo está procesando; según el medio, puede tardar unos días en verse."
              : " Según el medio, puede tardar unos días en verse en tu cuenta o en el resumen de la tarjeta."
            : ""
        } Si tenés alguna duda, respondé este mail.`,
        cta: null,
        number: p.number,
      },
      creditNote ? [creditNote] : undefined,
    );
  });
  // devolución de algunas prendas: nota de crédito por lo devuelto, adjunta al aviso de cuánto vuelve y por dónde
  events.on("OrderItemsReturned", async (e) => {
    const p = e.payload as {
      orderId: string;
      number: string;
      key: string;
      items: { name: string; size: string; qty: number }[];
      cents: number;
      cash: boolean;
      giftcardCents: number;
      pending: boolean;
      lines: InvoiceLine[];
    };
    const o = await orders.findById(p.orderId);
    if (!o) return;
    await invoicing.returned(p.orderId, p.key, p.lines).catch((err) => console.error("[facturas] devolución:", err));
    const creditNote = await invoicing.attachment(p.orderId, "nota_credito");
    const what = p.items.map((i) => `${i.qty > 1 ? `${i.qty} ` : ""}${i.name} (talle ${i.size})`).join(", ");
    const parts = [
      p.cents > 0
        ? `${formatARS(p.cents)} ${p.cash ? "en efectivo, en el taller" : "por el mismo medio con el que pagaste"}`
        : null,
      p.giftcardCents > 0 ? `${formatARS(p.giftcardCents)} al saldo de tu gift card` : null,
    ].filter(Boolean);
    await notifications.message(
      {
        to: o.email,
        subject: `Recibimos tu devolución del pedido #${p.number}`,
        eyebrow: `Pedido #${p.number} · devolución`,
        name: o.firstName || null,
        body: `Registramos la devolución de ${what}. Te devolvimos ${parts.join(" y ")}.${
          p.cents > 0 && !p.cash
            ? p.pending
              ? " Mercado Pago lo está procesando; según el medio, puede tardar unos días en verse."
              : " Según el medio, puede tardar unos días en verse en tu cuenta o en el resumen de la tarjeta."
            : ""
        } El resto del pedido sigue igual. Si tenés alguna duda, respondé este mail.`,
        cta: null,
        number: p.number,
      },
      creditNote ? [creditNote] : undefined,
    );
  });
  // cambio de talle desde el panel: el cliente tiene por escrito qué se cambió
  events.on("OrderSizeExchanged", async (e) => {
    const p = e.payload as {
      orderId: string;
      number: string;
      name: string;
      from: string;
      to: string;
      qty: number;
      shipped: boolean;
    };
    const o = await orders.findById(p.orderId);
    if (!o) return;
    await notifications.message({
      to: o.email,
      subject: `Cambiamos el talle de tu pedido #${p.number}`,
      eyebrow: `Pedido #${p.number} · cambio de talle`,
      name: o.firstName || null,
      body: `Cambiamos ${p.qty > 1 ? `${p.qty} ${p.name}` : p.name} del talle ${p.from} al ${p.to}. ${
        p.shipped
          ? "Te escribimos para coordinar cómo nos llega la prenda y cómo te mandamos la nueva."
          : "Lo preparamos con el talle nuevo."
      } Si tenés alguna duda, respondé este mail.`,
      cta: null,
      number: p.number,
    });
  });
  for (const t of ["PaymentNeedsRefund", "PaymentAmountMismatch"])
    events.on(t, (e) => console.warn(`[eventos] ${t}:`, JSON.stringify(e.payload)));

  // Galú: Claude si está ANTHROPIC_API_KEY, Ollama si está OLLAMA_URL; sin modelo, la tienda responde por reglas
  const llm: LlmProvider | null =
    config.assistant?.kind === "claude"
      ? new ClaudeProvider(new Anthropic({ apiKey: config.assistant.apiKey }), config.assistant.model)
      : config.assistant?.kind === "ollama"
        ? new OllamaProvider(config.assistant.url, config.assistant.model)
        : null;
  const notFoundAsNull = <T>(p: Promise<T>) =>
    p.catch((e: unknown) => {
      if (e instanceof NotFoundError) return null;
      throw e;
    });
  const assistantCatalog: AssistantCatalog = {
    search: (q) => catalog.list(q),
    // los borradores (lanzamientos sin publicar) no existen para Galú
    product: async (slug) => {
      const p = await notFoundAsNull(catalog.detail(slug));
      return p?.status === "published" ? p : null;
    },
    joinWaitlist: (req) => catalog.joinWaitlist(req),
  };
  // lo que Gaby le enseña, sus ajustes y las charlas (admin-galu.html)
  const assistantMemory = {
    log: new DrizzleConversationLog(db),
    facts: new DrizzleFacts(db),
    settings: new DrizzleAssistantSettings(db),
  };
  const assistant = new AssistantService(
    llm,
    assistantTools({
      catalog: assistantCatalog,
      orders: { track: (number) => notFoundAsNull(shipments.track(number, null)) },
      shipping: { options: (cp) => shipping.options(cp, 0) },
      payments: {
        installments: async (cents) => (await payments.installments([cents]))[cents] ?? { interestFree: 1, max: 1 },
      },
    }),
    assistantCatalog,
    async () => {
      const p = await policies.get();
      const free = freeShippingFrom(p);
      return {
        workshop: workshopPlace(p.workshop),
        freeShippingFrom: free === null ? null : formatARS(free),
        exchangeDays: p.exchangeDays,
        pickup: p.methods.taller ? pickupHoursLabel(p) : null,
        delivery: deliverySummary(p),
        giftcardRange: `${formatARS(GIFTCARD_MIN_CENTS)} a ${formatARS(GIFTCARD_MAX_CENTS)}`,
        whatsapp: whatsappUrl(p.contact.whatsapp),
        // las mismas {variables} que las páginas de ayuda
        vars: helpValues({ policies: p }),
      };
    },
    assistantMemory,
  );
  if (llm && config.env !== "test") console.info(`[galú] responde con ${llm.name}`);
  if (config.mail.kind === "resend" && config.env !== "test") console.info("[mails] salen por Resend");
  if (config.env !== "test")
    console.info(
      issuer.mode === "simulado"
        ? "[facturas] simuladas (sin ARCA_* en el .env)"
        : config.arca
          ? `[facturas] ARCA ${issuer.mode}, punto de venta ${issuer.pointOfSale}`
          : "[facturas] ARCA sin conectar: los pedidos quedan sin facturar",
    );

  // el programador arranca cuando ya existen todos los servicios (corre la primera vuelta al registrarse)
  const scheduler = new IntervalScheduler();
  if (config.env !== "test") {
    scheduler.every(60, "publicar lanzamientos", () => launches.publishDue());
    scheduler.every(60, "avisar lanzamientos", () => automations.launchNotices());
    scheduler.every(60, "liberar reservas vencidas", () => orderPayments.releaseExpired());
    scheduler.every(600, "consultar pagos en revisión", () => payments.reconcile());
    scheduler.every(60, "recordar links de pago", () => paymentLinks.remindUnpaid());
    scheduler.every(config.trackingEverySeconds, "seguimiento de envíos", () => shipments.sync());
    scheduler.every(3600, "pedir reseñas", () => automations.askReviews());
    scheduler.every(600, "stock bajo", () => automations.checkLowStock());
    scheduler.every(3600, "cumples que se acercan", () => automations.birthdays());
    scheduler.every(1800, "bolsas abandonadas", () => automations.idleCarts());
    scheduler.every(600, "mandar gift cards programadas", () => giftcards.deliverDue());
    scheduler.every(60, "reintentar facturas", () => invoicing.retryDue());
  }

  // tope por IP cada 10 minutos en las rutas públicas que mandan mails, reservan stock o se pueden adivinar
  // (en local y CI, alto: los e2e repiten estas rutas)
  const perIp = (max: number) => limitByIp(new RateLimiter(secure ? max : 1000, 10 * 60_000));

  const app = new Hono()
    .use(logger())
    // las fotos de /media las pide la tienda desde otro subdominio: la política de recursos no puede ser same-origin
    .use("*", secureHeaders({ crossOriginResourcePolicy: "cross-origin" }))
    .use("*", cors({ origin: config.webOrigin, credentials: true }))
    // JSON chico en todo lo demás; las fotos (panel y reseñas) tienen su propio tope
    .use("*", async (c, next) =>
      c.req.path.startsWith("/admin/") || c.req.path.startsWith("/reviews/") ? next() : jsonLimit(c, next),
    )
    .use("/media/*", mediaVariantsOnDemand(config.mediaDir, disk, resizer))
    .use(
      "/media/*",
      serveStatic({
        root: relative(process.cwd(), config.mediaDir),
        rewriteRequestPath: (p) => p.replace(/^\/media/, ""),
        // las subidas llevan nombre nuevo (UUID): una URL nunca cambia de contenido
        onFound: (_path, c) => c.header("Cache-Control", "public, max-age=31536000, immutable"),
      }),
    )
    .use("/checkout/orders", perIp(15))
    .use("/checkout/installments", perIp(120))
    .use("/giftcards/*", perIp(30))
    .use("/tracking/*", perIp(60))
    .use("/newsletter", perIp(10))
    .use("/catalog/waitlist", perIp(20))
    .use("/content/launches/*", perIp(60))
    .get("/health", (c) => c.json({ ok: true }))
    .route("/catalog", catalogRoutes(catalog))
    .route("/content/help", helpRoutes(help))
    .route(
      "/content",
      contentRoutes(content, launchVisits, async (headers) => {
        const session = await auth.api.getSession({ headers }).catch(() => null);
        return session?.user.role === "admin";
      }),
    )
    .route("/auth", authRoutes(auth))
    .use("/cart/*", cartOwner(auth, cart, secure))
    .use("/checkout/*", cartOwner(auth, cart, secure))
    .route("/cart", cartRoutes(cart, secure))
    .route("/checkout", checkoutRoutes(checkout))
    .route("/checkout", checkoutPaymentRoutes(payments))
    .route("/payments", webhookRoutes(payments))
    .route("/tracking", trackingRoutes(shipments))
    // tope por IP para no probar mails (en local y CI, alto: los e2e piden varias bajas seguidas)
    .route("/revocations", revocationRoutes(revocations, new RateLimiter(secure ? 20 : 500, 10 * 60_000)))
    .route("/newsletter", newsletterRoutes(newsletter))
    .route("/policies", policiesRoutes(policies))
    .route("/giftcards", giftcardRoutes(giftcards))
    .route("/reviews", reviewRoutes(reviews, new RateLimiter(secure ? 30 : 500, 10 * 60_000)))
    .use("/assistant/chat", cartOwner(auth, cart, secure))
    .use("/assistant/log", cartOwner(auth, cart, secure))
    .route("/assistant", assistantRoutes(assistant, { secure }))
    .route("/me", accountRoutes(auth, customers))
    .route("/lists", wishlistRoutes(customers))
    .get("/account/options", (c) => c.json({ google: !!config.google }))
    .use("/admin/*", requireAdmin(auth, config.requireAdmin2fa))
    .route("/admin/catalog", adminCatalogRoutes(adminCatalog, catalog))
    .route("/admin/content/launches", adminLaunchesRoutes(launches))
    .route("/admin/content/home", adminHomeRoutes(content))
    .route("/admin/content/help", adminHelpRoutes(help))
    .route("/admin/orders", adminShipmentRoutes(shipments))
    .route("/admin/orders", adminOrderRoutes(adminOrders, paymentLinks, sizeExchanges))
    .route("/admin/orders", adminRefundRoutes(refunds))
    .route("/admin/invoices", adminInvoiceRoutes(invoicing))
    .route("/admin/coupons", adminCouponRoutes(coupons))
    .route("/admin/reviews", adminReviewRoutes(reviews))
    .route("/admin/giftcards", adminGiftcardRoutes(giftcards))
    .route("/admin/payments", adminPaymentRoutes(payments))
    .route("/admin/shipping", adminShippingRoutes(shipments))
    .route("/admin/newsletter", adminNewsletterRoutes(newsletter))
    .route("/admin/subscribers", adminSubscribersRoutes(new SubscribersService(new DrizzleSubscribersReadModel(db))))
    .route("/admin/policies", adminPoliciesRoutes(policies))
    .route(
      "/admin/assistant",
      adminAssistantRoutes(new AssistantAdminService(assistantMemory, () => llm?.name ?? null, formatOrderNumber)),
    )
    .route(
      "/admin/customers",
      adminCustomerRoutes(
        new AdminCustomersService(new DrizzleAdminCustomers(db, storage, formatOrderNumber), undefined, {
          forEmail: (email) => points.summary(email),
        }),
      ),
    )
    .route(
      "/admin/automations",
      adminAutomationRoutes(automations, () => ({
        mail: "conectado",
        whatsapp: "sin_conectar",
        mercadopago: gateway.mode,
        andreani: config.andreani?.env ?? "simulado",
      })),
    )
    .onError(onError)
    .notFound((c) => c.json({ error: { code: "not_found", message: "Ruta inexistente" } }, 404));

  return { app, db, events, scheduler };
}

export type AppType = ReturnType<typeof buildApp>["app"];

const jsonLimit = bodyLimit({
  maxSize: 256 * 1024,
  onError: (c) => c.json({ error: { code: "payload_too_large", message: "El pedido es demasiado grande" } }, 413),
});

const AR_DAY = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "America/Argentina/Buenos_Aires",
});
const AR_DATE = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});
const longDay = (d: Date) => AR_DAY.format(d);

function giftcardMailData(c: GiftcardRecord & { code: string; expiresAt: Date }) {
  return {
    code: c.code,
    amountCents: c.amountCents,
    toName: c.toName,
    fromName: c.fromName,
    message: c.message,
    expiresLabel: AR_DATE.format(c.expiresAt),
    design: c.design,
  };
}
