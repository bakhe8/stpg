# خطة تنفيذ Platform Layer
# Platform vs Tenant Strategy — Implementation Guide

> **للمطوّر الذي يقرأ هذا الملف:**
> هذا الملف يحتوي على خطة تنفيذ كاملة ودقيقة يمكنك البدء منها مباشرةً بدون أي سياق سابق.
> الوثيقة المرجعية الكاملة للاستراتيجية: `Docs/05_Rules_and_Governance/platform_vs_tenant_roles.md`

---

> **حالة الوثيقة — 2026-06-23**
>
> خطة المراحل أدناه محفوظة كسجل تاريخي لمسار التنفيذ، وليست وصفاً دقيقاً للحالة الحالية بمفردها.
> عند التعارض، تكون أولوية الاعتماد لجدول **الحالة الحالية المعتمدة** التالي ثم للكود وعمليات التحقق الفعلية.

## الحالة الحالية المعتمدة

| المجال | الحالة | الملاحظة |
|---|---|---|
| فصل حسابات Platform عن Tenant | ✅ مكتمل | حسابات ورموز دخول وحراس ومسارات منفصلة؛ التحقق التشغيلي أعاد `403` في الاتجاهين عند عبور حدود الطبقتين |
| إدارة حالات الكيانات | ✅ مكتمل | تدعم المنصة `ACTIVE`, `SUSPENDED`, `READ_ONLY`, `PENDING_REVIEW` |
| سجل وصول المنصة | ✅ مكتمل | السبب والنطاق إلزاميان وتُسجّل العمليات الخاصة بالكيان |
| تصدير بيانات الكيان المعلّق | ✅ مكتمل | يوجد مسار تصدير صريح مستثنى من حظر التعليق |
| اعتراض الكيان على تعليق المنصة | ✅ مكتمل | توجد دورة تقديم الاعتراض وعرضه والرد عليه |
| Support View محدد المدة والموافقة | ❌ غير مكتمل | مكوّن `PlatformSupportBanner` موجود فقط؛ لا توجد جلسة دعم مرتبطة بموافقة ونافذة زمنية قابلة للإنهاء |
| عزل RLS على مستوى قاعدة البيانات | ⚠️ مطبق جزئياً | migration والسياسات موجودة، لكن سياق المستأجر لا يُشغّل عبر `TenantContextService.run()` والخدمات لا تستخدم `prisma.extended` بصورة تشغيلية |
| هوية الواجهات ومكوّنات تفسير الثقة | ✅ مكتملة بالكامل | جميع الشاشات العشر موافقة لـ `Docs/07_Frontend`؛ `paths/[id]` أُصلح فيه bug غياب أزرار التبويبات؛ `wallets/[id]` استُبدلت فيه `confirm()/alert()` بـ `ConfirmActionDialog` |
| توافق الشاشات مع فلسفة الحوكمة | ✅ مكتمل — 2026-06-22 | 10/10 شاشات تتبع "القواعد قبل الإجراءات"؛ تفاصيل في `Docs/IMPLEMENTATION_GAP_MATRIX.md` |
| استجابة الجوال (Mobile Responsive) | ✅ مكتمل — 2026-06-22 | BottomNav (5 بنود + more) + Responsive CSS عالمي + EmptyState component + breakpoints لـ 4 صفحات إضافية |
| **v2 — نظام قوالب الكيانات (Entity Templates)** | ✅ مكتمل — 2026-06-23 (v2-development) | مخطط قاعدة البيانات + CRUD backend + 5 قوالب مبدئية + واجهة Platform Admin + معالج إنشاء 3 خطوات — تفاصيل أدناه |
| **v2 — السايدبار المتكيّف (Adaptive Sidebar)** | ✅ مكتمل — 2026-06-23 (v2-development) | AppShell يحسب union لـ enabledModules عبر كل كيانات المستخدم ويُخفي/يُظهر بنود التنقل بناءً عليها — تفاصيل أدناه |

---

## السياق — لماذا هذا التغيير؟

النظام الحالي يعامل كل المستخدمين كـ Tenant Users (أعضاء داخل الكيانات).
القرار الاستراتيجي: التمييز بين محورين منفصلين:

```
Platform Layer  — القائمون على المنصة نفسها (المطوّر، الدعم، المشرف)
Tenant Layer    — مستخدمو الكيانات (أعضاء، مدراء، مراجعون)
```

**القاعدة الذهبية:** Platform operator لا يعدّل سجلاً مالياً داخل أي كيان.
كل وصول من المنصة لبيانات كيان يُسجَّل ويُشعَر به مدير ذلك الكيان.

---

## نقطة البداية التاريخية قبل التنفيذ

> هذا القسم يصف الكود قبل بدء تنفيذ Platform Layer، ولا يصف المستودع الحالي.

### Backend
- `Person` model — يضم كل المستخدمين (Tenant فقط)
- `JwtPayload { sub: string, username: string }` — لا يميّز النوع
- `JwtStrategy.validate()` — يبحث في `persons` فقط
- `issueTokenPair(person: Person)` في `auth.service.ts` — يصدر JWT بدون `userType`
- `JwtGuard` — واحد لكل شيء
- `MemberRole` enum: FOUNDER | ADMIN | TREASURER | AUDITOR | COMMITTEE_MEMBER | MEMBER
- **لا يوجد:** `PlatformAccount`, `PlatformRole`, `PlatformAccessLog`, `entityStatus`

### Frontend
- 27 صفحة كلها في `frontend/src/app/(main)/`
- لا يوجد مجموعة مسارات `/platform`
- لا توجد صفحة "وصول المنصة لبياناتك"

---

## المراحل الأربع

---

## المرحلة 1 — Prisma Schema ✅ مكتملة
**الوقت المقدر:** 2-3 ساعات | **الخطر:** صفر — إضافة فقط، لا تعديل
**تاريخ الإنجاز:** 2026-06-21 | **migration:** `20260621095007_add_platform_layer`

### 1.1 إضافة Enums جديدة

في `backend/prisma/schema.prisma`، أضف بعد `enum MemberRole`:

```prisma
/// دور المستخدم في منصة CollectiveTrustOS (Platform Layer)
enum PlatformRole {
  OWNER        // مالك المنصة — صلاحيات كاملة
  SUPER_ADMIN  // مشرف عام — إدارة يومية
  SUPPORT      // دعم فني — وصول مقيّد بالزمن والسبب
  ANALYST      // محلل — إحصاءات مجمّعة فقط، بدون PII

  @@map("platform_role")
}

/// نوع وصول Platform Operator لبيانات كيان
enum PlatformAccessType {
  READ          // قراءة عادية ضمن دعم فني
  SUPPORT       // حل مشكلة تقنية محددة
  ADMIN_ACTION  // إجراء إداري (تعليق، تفعيل)
  BREAK_GLASS   // وصول استثنائي طارئ

  @@map("platform_access_type")
}

/// حالة الكيان على مستوى المنصة
enum EntityPlatformStatus {
  ACTIVE       // نشط
  SUSPENDED    // معلّق — لا عمليات جديدة، لا دخول للأعضاء
  READ_ONLY    // قراءة فقط — الأعضاء يرون بياناتهم لكن لا يتصرفون
  PENDING_REVIEW // قيد المراجعة — الكيان يعمل مع إشعار للمدير

  @@map("entity_platform_status")
}
```

### 1.2 إضافة Models جديدة

في `backend/prisma/schema.prisma`، أضف قسماً جديداً `GROUP 0: PLATFORM LAYER` قبل `GROUP 0: AUTHENTICATION`:

```prisma
// =================================================================
// GROUP -1: PLATFORM LAYER
// طبقة المنصة — منفصلة تماماً عن Tenant Layer
// لا تحتوي هذه الجداول على entity_id — الفصل منطقي وليس DB منفصل
// =================================================================

/// حساب القائم على المنصة — مستقل تماماً عن Person (Tenant)
model PlatformAccount {
  id           String        @id @default(uuid()) @db.Uuid
  email        String        @unique
  /// كلمة مرور مشفرة بـ bcrypt — Platform Operators يسجلون بـ email+password لا OTP
  passwordHash String
  name         String
  role         PlatformRole  @default(SUPPORT)
  isActive     Boolean       @default(true)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  accessLogs   PlatformAccessLog[]

  @@map("platform_accounts")
}

/// سجل كل وصول من Platform Operator لبيانات كيان
/// هذا السجل مرئي لمدير الكيان — شرط أساسي للثقة
model PlatformAccessLog {
  id                  String              @id @default(uuid()) @db.Uuid
  platformAccountId   String              @db.Uuid
  entityId            String              @db.Uuid
  accessType          PlatformAccessType
  /// وصف دقيق لما تم الوصول إليه (مثال: "جداول transactions و documents")
  dataScope           String
  /// السبب الموثق وجوباً قبل أي وصول
  reason              String
  startedAt           DateTime            @default(now())
  /// null = الجلسة لا تزال مفتوحة
  endedAt             DateTime?
  /// هل أُشعر مدير الكيان؟
  notifiedEntityAdmin Boolean             @default(false)
  /// للـ Break-glass فقط: هل تمت المراجعة الداخلية بعد 48 ساعة؟
  reviewed            Boolean             @default(false)

  platformAccount     PlatformAccount     @relation(fields: [platformAccountId], references: [id])

  @@index([entityId])
  @@index([platformAccountId])
  @@map("platform_access_logs")
}
```

### 1.3 تعديل model Entity

أضف حقل `platformStatus` لـ `Entity` model:

```prisma
// داخل model Entity أضف:
platformStatus  EntityPlatformStatus  @default(ACTIVE)
suspendedAt     DateTime?
suspendedReason String?
```

### 1.4 تشغيل Migration

```bash
cd backend
npx prisma migrate dev --name add_platform_layer
npx prisma generate
```

### ✅ نقطة تحقق المرحلة 1
```bash
npx prisma studio  # تحقق أن الجداول ظهرت: platform_accounts, platform_access_logs
# تحقق أن Entity لها حقل platformStatus
```

---

## المرحلة 2 — Auth Layer ✅ مكتملة
**الوقت المقدر:** 4-6 ساعات | **الخطر:** متوسط — يغيّر JWT، يحتاج اختبار دقيق
**تاريخ الإنجاز:** 2026-06-21

**المبدأ:** الكود الحالي للـ Tenant لا يتأثر. نضيف طبقة موازية.

### 2.1 تحديث JwtPayload

**الملف:** `backend/src/identity/auth/jwt-payload.interface.ts`

```typescript
// قبل
export interface JwtPayload {
  sub: string;
  username: string;
  iat?: number;
  exp?: number;
}

// بعد
export type UserType = 'tenant' | 'platform';

export interface JwtPayload {
  sub: string;        // personId (tenant) أو platformAccountId (platform)
  username: string;   // username (tenant) أو email (platform)
  userType: UserType; // التمييز الأساسي
  iat?: number;
  exp?: number;
}
```

### 2.2 تحديث JwtStrategy

**الملف:** `backend/src/identity/auth/jwt.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from './jwt-payload.interface';
import { getAccessTokenSecret } from './jwt-secrets';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getAccessTokenSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.userType === 'platform') {
      const account = await this.prisma.platformAccount.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, role: true, isActive: true },
      });
      if (!account || !account.isActive) {
        throw new UnauthorizedException();
      }
      // نُرجع الـ account مع علامة تميّزه
      return { ...account, userType: 'platform' as const };
    }

    // Tenant (السلوك الحالي — لا يتغيّر)
    const person = await this.prisma.person.findUnique({
      where: { id: payload.sub },
    });
    if (!person) {
      throw new UnauthorizedException();
    }
    return { ...person, userType: 'tenant' as const };
  }
}
```

### 2.3 إضافة PlatformGuard

**ملف جديد:** `backend/src/identity/auth/platform.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class PlatformGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.userType !== 'platform') {
      throw new ForbiddenException(
        'هذا الـ endpoint مخصص لفريق المنصة فقط',
      );
    }

    return true;
  }
}
```

**الاستخدام على أي controller:**
```typescript
@UseGuards(JwtGuard, PlatformGuard)
@Get('platform/entities')
getAllEntities() { ... }
```

### 2.4 إضافة CurrentPlatformUser Decorator

**ملف جديد:** `backend/src/identity/auth/decorators/current-platform-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentPlatformUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // { id, email, name, role, userType: 'platform' }
  },
);
```

### 2.5 إضافة platform-auth module

**مجلد جديد:** `backend/src/platform-auth/`

```
platform-auth/
  platform-auth.module.ts
  platform-auth.controller.ts
  platform-auth.service.ts
  dto/
    platform-login.dto.ts
    create-platform-account.dto.ts
```

**platform-auth.service.ts (الأساسي):**

```typescript
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const account = await this.prisma.platformAccount.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!account || !account.isActive) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    // userType = 'platform' في JWT
    const accessToken = this.jwtService.sign({
      sub: account.id,
      username: account.email,
      userType: 'platform',
    });

    return {
      accessToken,
      account: { id: account.id, name: account.name, role: account.role },
    };
  }

  // يُستخدم مرة واحدة لإنشاء حساب المالك الأول — احمه بـ OWNER_BOOTSTRAP_SECRET
  async createFirstOwner(email: string, password: string, name: string) {
    const exists = await this.prisma.platformAccount.findFirst();
    if (exists) {
      throw new ConflictException('حساب المنصة الأول موجود بالفعل');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.platformAccount.create({
      data: { email: email.toLowerCase(), passwordHash, name, role: 'OWNER' },
      select: { id: true, email: true, name: true, role: true },
    });
  }
}
```

**ملاحظة:** أضف `bcrypt` كـ dependency:
```bash
cd backend && npm install bcrypt && npm install -D @types/bcrypt
```

### ✅ نقطة تحقق المرحلة 2

```bash
# اختبار: تسجيل دخول Platform لا يكسر تسجيل دخول Tenant
POST /auth/verify-otp → JWT يحتوي userType: 'tenant'  ✓
POST /platform-auth/login → JWT يحتوي userType: 'platform'  ✓
GET /entities (JwtGuard فقط) → tenant يدخل ✓، platform يدخل ✓
GET /platform/entities (JwtGuard + PlatformGuard) → tenant يُرفض 403 ✓، platform يدخل ✓
```

---

## المرحلة 3 — Platform Core Module ✅ مكتملة
**الوقت المقدر:** يوم كامل | **الخطر:** منخفض — وحدات مستقلة
**تاريخ الإنجاز:** 2026-06-21

### 3.1 هيكل المجلد

```
backend/src/
  platform-auth/          (من المرحلة 2)
  platform-entities/      (جديد)
  platform-access-log/    (جديد)
```

### 3.2 platform-entities module

**وظيفته:** عرض كل الكيانات وتعليقها.

```typescript
// platform-entities.controller.ts
@Controller('platform/entities')
@UseGuards(JwtGuard, PlatformGuard)
export class PlatformEntitiesController {

  // قائمة كل الكيانات — للمشرف العام
  @Get()
  findAll(@Query() query: { status?: string; page?: number }) { ... }

  // تعليق كيان
  @Patch(':id/suspend')
  suspend(
    @Param('id') id: string,
    @Body() body: { reason: string; statusType: EntityPlatformStatus },
    @CurrentPlatformUser() operator,
  ) { ... }

  // رفع التعليق
  @Patch(':id/activate')
  activate(@Param('id') id: string) { ... }
}
```

**مهم:** عند تعليق كيان، يجب إرسال إشعار لمؤسس الكيان.
الإشعار يُضاف لجدول `notifications` الموجود مع `entityId` المعني.

### 3.3 platform-access-log module

**وظيفته:** تسجيل الوصول وتوفير API لمدير الكيان.

**Interceptor تلقائي للتسجيل:**

```typescript
// platform-access.interceptor.ts
// يُضاف على كل controllers تعمل على بيانات كيان محدد
@Injectable()
export class PlatformAccessInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // يعمل فقط عندما platform_user يصل لـ entity محدد
    if (user?.userType !== 'platform') return next.handle();

    const entityId = request.params?.id || request.params?.entityId;
    if (!entityId) return next.handle();

    const logEntry = await this.prisma.platformAccessLog.create({
      data: {
        platformAccountId: user.id,
        entityId,
        accessType: 'READ',
        dataScope: `${request.method} ${request.path}`,
        reason: request.headers['x-access-reason'] || 'لم يُحدَّد',
        startedAt: new Date(),
      },
    });

    return next.handle().pipe(
      tap(async () => {
        await this.prisma.platformAccessLog.update({
          where: { id: logEntry.id },
          data: { endedAt: new Date() },
        });
      }),
    );
  }
}
```

**Endpoint لمدير الكيان:**

```typescript
// في entities.controller.ts (الموجود) — أضف:
@Get(':id/platform-access-logs')
@UseGuards(JwtGuard)
async getPlatformAccessLogs(
  @Param('id') entityId: string,
  @CurrentUser() user,    // tenant user
) {
  // تحقق أن المستخدم هو FOUNDER أو ADMIN في هذا الكيان
  // ثم أرجع PlatformAccessLog للـ entityId
  return this.platformAccessLogService.findByEntity(entityId);
}
```

### 3.4 SuspendedEntityGuard

```typescript
// suspended-entity.guard.ts
// يُضاف على كل الـ entity-specific endpoints
@Injectable()
export class SuspendedEntityGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const entityId = request.params?.entityId || request.params?.id;
    if (!entityId) return true;

    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { platformStatus: true, suspendedReason: true },
    });

    if (!entity) return true;

    if (entity.platformStatus === 'SUSPENDED') {
      throw new ForbiddenException({
        message: 'هذا الكيان معلّق مؤقتاً',
        reason: entity.suspendedReason,
        code: 'ENTITY_SUSPENDED',
      });
    }

    if (entity.platformStatus === 'READ_ONLY') {
      // السماح بـ GET فقط
      if (request.method !== 'GET') {
        throw new ForbiddenException({
          message: 'هذا الكيان في وضع القراءة فقط مؤقتاً',
          code: 'ENTITY_READ_ONLY',
        });
      }
    }

    return true;
  }
}
```

### ✅ نقطة تحقق المرحلة 3

```bash
# تعليق كيان
PATCH /platform/entities/:id/suspend  { reason: "...", statusType: "SUSPENDED" }
→ Entity.platformStatus = SUSPENDED ✓
→ Notification أُرسلت لمؤسس الكيان ✓

# محاولة عضو تنفيذ عملية في كيان معلّق
POST /entities/:id/decisions → 403 ENTITY_SUSPENDED ✓

# مدير الكيان يرى من دخل بياناته
GET /entities/:id/platform-access-logs → قائمة PlatformAccessLog ✓
```

---

## المرحلة 4 — Frontend ⚠️ مكتملة جزئياً
**الوقت المقدر:** نصف يوم | **الخطر:** منخفض — إضافات مستقلة
**تاريخ الإنجاز:** 2026-06-21

### 4.1 هيكل المسارات الجديدة

```
frontend/src/app/
  (main)/                    ← Tenant Layer (موجود، لا يتغيّر)
    dashboard/
    entities/
    ...
  platform/                  ← Platform Layer (جديد)
    layout.tsx               ← Layout مختلف بالكامل
    login/
      page.tsx               ← تسجيل دخول بـ email + password
    (dashboard)/
      page.tsx               ← قائمة الكيانات + حالتها
      entities/
        page.tsx             ← إدارة الكيانات
```

### 4.2 Platform Layout

`frontend/src/app/platform/layout.tsx`

```tsx
// Layout مختلف تماماً — sidebar مبسط لفريق المنصة
export default function PlatformLayout({ children }) {
  return (
    <div className={styles.platformShell}>
      <PlatformSidebar />
      <main className={styles.platformMain}>
        {children}
      </main>
    </div>
  );
}
```

**تمييز بصري واضح:** خلفية أو لون مختلف يُظهر أنك في لوحة المنصة، لا لوحة كيان.

### 4.3 صفحة وصول المنصة في Entity Admin

`frontend/src/app/(main)/entities/[id]/platform-access/page.tsx`

```tsx
// تُضاف كـ tab أو صفحة منفصلة في إدارة الكيان
// تعرض GET /entities/:id/platform-access-logs

export default function PlatformAccessPage({ params }) {
  return (
    <div>
      <h2>وصول فريق المنصة إلى بيانات كيانك</h2>
      <p className={styles.notice}>
        هذه الصفحة تُظهر كل مرة وصل فيها أحد من فريق المنصة إلى بيانات كيانك.
      </p>
      <PlatformAccessLogTable entityId={params.id} />
    </div>
  );
}
```

### 4.4 Support View Banner

عندما platform_user يصل لكيان معين بـ Support mode، يُضاف header:

```tsx
// PlatformSupportBanner.tsx — يُضاف في (main)/layout.tsx
{user?.userType === 'platform' && (
  <div className={styles.supportBanner}>
    ⚠ وضع عرض الدعم — قراءة فقط — {user.name} — {accessWindow}
  </div>
)}
```

**الحالة الحالية:** المكوّن موجود في الكود، لكنه غير مربوط بالـ layout ولا توجد بعد جلسة دعم فعلية بموافقة مسبقة ووقت بداية ونهاية ونطاق وصول. لذلك لا يُعد Support View مكتملاً.

### ✅ نقطة تحقق المرحلة 4

```
/platform/login          → يدخل بـ email + password ✓
/platform               → يرى قائمة الكيانات ✓
/entities/:id/platform-access → مدير الكيان يرى سجل الوصول ✓
Support View محدد المدة والموافقة → غير مكتمل ✗
```

---

## ما لا يدخل في MVP — مؤجل بقرار

| الميزة | السبب |
|---|---|
| Break-glass UI كاملة | يكفي تسجيله في PlatformAccessLog بـ `accessType: BREAK_GLASS` |
| Reseller / Partner | غير مطلوب في النسخة الأولى |

---

## حالة التنفيذ الحالية — مكتمل مع فجوتين معماريتين

اكتمل الفصل الأساسي بين Platform وTenant، وإدارة حالات الكيانات، وسجل الوصول، والتصدير، والاعتراض. المتبقي قبل اعتبار الطبقة مكتملة معمارياً:

1. تنفيذ Support View كجلسة مقيدة بالموافقة والنطاق والمدة، لا كمكوّن واجهة فقط.
2. توصيل سياق Tenant بكل طلب واستخدام Prisma الممتد فعلياً حتى تصبح سياسات RLS طبقة عزل تشغيلية وليست migration ساكنة.

---

## ترتيب التنفيذ الموصى به

```
اليوم 1:  المرحلة 1 (Schema) + اختبار Migration
اليوم 2:  المرحلة 2 (Auth) + اختبار شامل للـ JWT
اليوم 3:  المرحلة 3 Backend (Platform Modules)
اليوم 4:  المرحلة 4 Frontend + اختبار شامل
```

---

## Checklist الاختبار النهائي

```
☑ POST /platform-auth/login → JWT userType: 'platform'
☑ دخول Tenant → JWT userType: 'tenant'
☑ Tenant لا يصل لـ /platform/** → 403
☑ Platform لا يصل إلى Tenant endpoints → 403
☑ Platform لا يعدّل سجلاً مالياً → لا توجد endpoints تسمح بذلك
☑ PlatformAccessLog يُكتب عند عمليات المنصة الخاصة بالكيان
☑ مدير الكيان يرى السجل في /entities/:id/platform-access-logs
☑ كيان معلّق → تُحظر العمليات التشغيلية مع رسالة واضحة
☑ كيان معلّق → يمكن تصدير البيانات عبر endpoint مخصص
☑ مدير الكيان يستطيع تقديم اعتراض على تعليق المنصة
☐ Support View مرتبط بموافقة ونطاق ونافذة زمنية
☐ Tenant context مربوط بكل طلب والخدمات تستخدم prisma.extended لتفعيل RLS
□ Build نظيف: cd backend && npm run build
□ Tests تعمل: cd backend && npm test
```

---

## الملفات الجديدة والمعدّلة — ملخص

### معدّلة
- `backend/prisma/schema.prisma` — إضافة Platform enums + models + entityStatus
- `backend/src/identity/auth/jwt-payload.interface.ts` — إضافة userType
- `backend/src/identity/auth/jwt.strategy.ts` — دعم platform lookup
- `backend/src/app.module.ts` — تسجيل platform modules

### جديدة (Backend)
- `backend/src/platform-auth/` (module كامل)
- `backend/src/platform-entities/` (module كامل)
- `backend/src/platform-access-log/` (module + interceptor)
- `backend/src/identity/auth/platform.guard.ts`
- `backend/src/identity/auth/decorators/current-platform-user.decorator.ts`
- `backend/src/common/guards/suspended-entity.guard.ts`

### جديدة (Frontend)
- `frontend/src/app/platform/` (مجموعة مسارات كاملة)
- `frontend/src/app/(main)/entities/[id]/platform-access/page.tsx`
- `frontend/src/components/platform/PlatformSupportBanner.tsx`

---

## المراجع

- الاستراتيجية الكاملة: `Docs/05_Rules_and_Governance/platform_vs_tenant_roles.md`
- الصلاحيات داخل الكيان: `Docs/05_Rules_and_Governance/access_control_and_privacy.md`
- المعمارية العامة: `Docs/02_Architecture/system_architecture.md`
- فهرس كل الوثائق: `Docs/README.md`

---

---

# تقييم الفرونتيند مقابل فلسفة 07_Frontend — لقطة تاريخية
## Frontend Philosophy Audit — حالة سابقة أثناء موجات التنفيذ

> **المرجع:** `Docs/07_Frontend/Philosophy.md` + `Details_of_confidence_during_daily_use.md` + `frontend_refactoring_report.md`
>
> هذا القسم يوثّق نتيجة تدقيق أُجري أثناء التنفيذ، وليس جرداً نهائياً للحالة الحالية.
> البنود التي تصف `RequestTimeline`, `VisibilityNotice`, `AccessReasonPanel`, `PaymentMatchPanel` أو توسعة `RuleSummaryPanel` بأنها غائبة أصبحت تاريخية بعد تنفيذها وربطها بالصفحات.

### تصحيح الحالة الحالية لهذا التدقيق

| المكوّن | الحالة الحالية |
|---|---|
| `RequestTimeline` | موجود ومستخدم في طلبات الصرف والنزاعات وطلبات العضوية والمالية |
| `VisibilityNotice` | موجود ومستخدم في طلبات الصرف وواجهة المراجع |
| `AccessReasonPanel` | موجود ومستخدم لشرح أهلية وإتاحة التصويت في القرارات |
| `PaymentMatchPanel` | موجود ومستخدم في مراجعة الكيان والمالية |
| `RuleSummaryPanel` | توسعت تغطيته لتشمل القرارات والنزاعات والمراجعة والبوابة والاشتراكات إضافة إلى الصرف |

> تبقى الملاحظات التالية مفيدة لفهم سبب بناء هذه المكوّنات، لكن عبارات «غائب» و«لم يُطبّق» فيها لا تعتمد لتحديد العمل المتبقي.

---

## المبدأ الجوهري

> **"الواجهة يجب أن تعرض القواعد قبل العمليات."**

النظام ليس تطبيق اشتراكات. الأسئلة الجوهرية هي:
- من ينتمي؟ من يساهم؟ من يستفيد؟
- من يوافق؟ من يرى التفاصيل؟ من يعترض؟
- **ولماذا يظهر هذا الإجراء لهذا الشخص تحديداً؟**

---

## القسم أ — ما طُبِّق بالكامل ✅

| الفلسفة المطلوبة | الملف المُنفِّذ | التفاصيل |
|---|---|---|
| **"المطلوب مني الآن"** — شاشة رئيسية Action-Oriented | `app/(main)/dashboard/page.tsx` | `buildActionItems()` يجمع: دفعات متأخرة، دفعات معلقة، طلبات انضمام، إثباتات دفع أُرسلت — عرض طابور مهام لا لوحة إحصاءات |
| **محافظي** — WalletContext بدلاً من جداول فواتير | `app/(main)/portal/page.tsx` | كل اشتراك فعّال يظهر كـ "بطاقة سياقية": الكيان ← المحفظة ← المسار ← حالة الدفع ← حقوقي في هذا المسار |
| **دورة حياة التأخر** (3 مستويات) | `portal/page.tsx` | فترة السماح (1–15 يوم) → متأخرة (15–30 يوم) → متأخرة جداً (30+ يوم) مع تحذير "قد يُوقَف اشتراكك" + زر نابض |
| **مركز المراجعات** — توحيد الطوابير | `app/(main)/entities/[id]/review/page.tsx` | 4 تبويبات: إيصالات الدفع / الاشتراكات / طلبات الصرف / النزاعات — FOUNDER/ADMIN فقط |
| **مركز مراجعات متعدد الكيانات** | `app/(main)/review-center/page.tsx` | للمدير الذي يدير أكثر من كيان — يجمع طوابير الكيانات التي هو مدير فيها |
| **مسار الاعتماد عند الانضمام** | `app/join/[token]/page.tsx` | يعرض 3 خطوات: الانضمام ← الاشتراك في مسار ← المساهمة. بعد الإرسال: "⏳ طلبك الآن بانتظار مراجعة الإدارة" |
| **إدارة الأعضاء** (role + context) | `app/(main)/entities/[id]/members/page.tsx` | طلبات الانضمام المعلقة / الأعضاء الفعّالون مع أدوارهم / تغيير الدور / إزالة / إعادة تفعيل |
| **تحذير تعارض المصالح** | `app/(main)/decisions/page.tsx` | شارة `.coiBanner` تظهر لأنواع: EXPEL_MEMBER, ACCEPT_MEMBER, DISBURSE_FUNDS, MODIFY_SUBSCRIPTION — زر "أُعلن تعارضاً" يضبط تلقائياً على ABSTAIN |
| **الإقرار القانوني قبل إنشاء الكيان** | `app/(main)/entities/new/page.tsx` | مربع اختيار 4-بنود يجب قبوله قبل تفعيل زر "إنشاء الكيان" |
| **توجيه الدفع** من المحفظة لصفحة الدفع | `portal/page.tsx` → `finance?tab=payment&dueId=X` | الأزرار الأربعة تمرر `dueId` و `tab=payment` ← صفحة finance تفتح التبويب الصحيح تلقائياً |
| **RuleSummaryPanel** (مكوّن موجود) | `components/Governance/RuleSummaryPanel.tsx` | مستخدم في `disbursement-requests/page.tsx` لشرح قاعدة الصرف |

---

## القسم ب — ما طُبِّق جزئياً ⚠️

### ب.1 RuleSummaryPanel — موجود لكن غير مكتمل التغطية

**المطلوب من الوثيقة:**
> "يُضاف في: طلب التصويت، طلب الصرف، رفع الإيصال، صفحة المحفظة، صفحة الاعتراض، صفحة العضوية"

**الواقع الحالي:**

| الصفحة | الحالة | الفجوة |
|---|---|---|
| `disbursement-requests` | ✅ موجود | — |
| `decisions` | ❌ غائب | لا يشرح لماذا يُطلب تصويتك على هذا القرار تحديداً |
| `portal` | ❌ غائب | لا يشرح أي قاعدة تولّد هذا الاستحقاق |
| `entities/[id]/review` | ❌ غائب | لا يشرح شرط الموافقة عند مراجعة إيصال أو طلب صرف |
| `disputes` | ❌ غائب | لا يشرح آلية الاعتراض المطبّقة في هذا الكيان |
| `subscriptions` | ❌ غائب | لا يشرح شروط المسار عند إنشاء اشتراك |

---

### ب.2 PaymentMatchPanel — مراجعة الإيصال بدون مقارنة واضحة

**المطلوب من الوثيقة:**
```
مطابقة الإيصال

المبلغ المطلوب حسب القاعدة: 100 ر.س
المبلغ المرفوع: 100 ر.س
الفترة: يونيو 2026
الحالة: مطابق ✓
```

**الواقع الحالي:** `finance/page.tsx` يعرض المبلغين لكن بتخطيط جدولي عام، لا بمقارنة مرئية مخصصة تُظهر التطابق أو الفارق بشكل بصري واضح لأمين الصندوق.

---

### ب.3 Empty States — عامة لا معنوية

**المطلوب من الوثيقة:**
```
لا يوجد مطلوب منك الآن
أنت منتظم في جميع المحافظ
آخر تحديث: تم اعتماد تقرير شهر يونيو
```

**الواقع الحالي:** معظم الصفحات تعرض "لا توجد بيانات" أو رسالة مختصرة دون سياق. المحفظة الفارغة في `portal` تقول "أنت لست مشتركاً في أي مسار فعّال" وهي معقولة لكنها لا تُضيف السياق الاجتماعي ("منتظم / لا يوجد إجراء مطلوب").

---

### ب.4 شاشة رفع الإيصال — مرتبطة بالكيان والمحفظة لكن ليست "ذكية" بالكامل

**المطلوب من الوثيقة:**
```
رفع إثبات دفع

المحفظة: الاشتراكات العامة
الفترة: يونيو 2026
المبلغ المطلوب: 100 ريال    ← من القاعدة
المبلغ المدفوع: ____
هل يقبل دفع جزئي؟ (نعم/لا حسب القاعدة)
```

**الواقع الحالي:** `finance/page.tsx` يعرض المبلغ المطلوب عند اختيار الاستحقاق، لكن لا يعرض "هل يقبل دفع جزئي؟" ولا "هل يوجد إعفاء أو تأجيل للفترة؟" — هذه تحتاج حقولاً من الـ policy لم تُسحب بعد للواجهة.

---

## القسم ج — ما لم يُطبَّق بعد ❌

### ج.1 Timeline لكل طلب — "وين وصل طلبي؟"

**المطلوب من الوثيقة:**
```
طلب صرف #24

1. تم إنشاء الطلب — أحمد — 10:30
2. أرفق تقرير طبي — 10:34
3. وافق عضو اللجنة الأول — 11:00
4. بانتظار موافقة العضو الثاني ← الوضع الحالي
```

**يجب أن يكون موجوداً في:**
- `disbursement-requests` — طلب الصرف في أي مرحلة؟
- `disputes` / `disputes/[id]` — النزاع وصل لأي خطوة؟
- `subscriptions` — الاشتراك في أي حالة؟
- `entities/[id]/members` — طلب الانضمام وين وصل؟
- `finance` (عرض الإيصال للمدير) — متى رُفع؟ من راجع؟

**البيانات متوفرة في الـ backend** (`createdAt`, `reviewedAt`, `status`) — التنفيذ مطلوب فرونتيند فقط.

---

### ج.2 VisibilityNotice — "لماذا هذه البيانات مخفية؟"

**المطلوب من الوثيقة:**
```
اسم المستفيد مخفي
لأن هذا البند مصنّف كحالة صحية حساسة.
المبلغ ظاهر لأصحاب المحفظة.
```

**المبدأ:** نخفي الإنسان ولا نخفي المال.

**الواقع الحالي:** لا يوجد مكوّن `VisibilityNotice` أو `SensitiveDataMask`. عندما تكون بيانات مخفية (VisibleToCommittee, HiddenSensitive, AggregatedOnly)، لا توجد رسالة تشرح السبب للمستخدم. المستخدم يرى بياناتٍ ناقصة دون أن يفهم أن ذلك سياسة خصوصية لا خطأ تقني.

**ستة مستويات الشفافية (من `access_control_and_privacy.md`) التي تحتاج تمثيلاً بصرياً:**

| المستوى | المعنى | مثال |
|---|---|---|
| `PublicToMembers` | مرئي لكل أعضاء الكيان | رصيد محفظة الاشتراكات |
| `VisibleToParticipants` | مرئي للمشتركين في المسار فقط | توزيعات محفظة مخصصة |
| `VisibleToCommittee` | مرئي للجنة فقط | اسم المستفيد في حالة علاج |
| `VisibleToAuditor` | مرئي للمراجع فقط | التقارير المالية التفصيلية |
| `HiddenSensitive` | مخفي إلا لمعالج الحالة | بيانات طبية حساسة |
| `AggregatedOnly` | يظهر كإجمالي فقط | المتأخرات بدون أسماء |

---

### ج.3 AccessReasonPanel — "لماذا لا أستطيع؟"

**المطلوب من الوثيقة:**
```
لا يمكنك التصويت على هذا القرار
لأنك لست مشتركاً في مسار مجلس الإدارة لهذه المحفظة.
```

أو:

```
لا يمكنك طلب استفادة من محفظة العلاج
لأن فترة الانتظار (90 يوماً) لم تنتهِ بعد.
تبقّى: 23 يوماً.
```

**الواقع الحالي:** عند منع الوصول يُظهر الـ backend خطأ 403 دون تفسير مفهوم للمستخدم. لا يوجد مكوّن `AccessReasonPanel` يترجم كود الخطأ لرسالة اجتماعية واضحة.

---

### ج.4 "شروط المحفظة" قبل الاشتراك

**المطلوب من الوثيقة:**
```
هذه شروط المسار:
- الاشتراك: 100 ريال شهرياً
- الحوكمة: لجنة من 3 أعضاء تعتمد الصرف
- حق الاعتراض: خلال 7 أيام
- الاستفادة: بعد 90 يوماً من التفعيل
- الخصوصية: اسم المستفيد مخفي في الحالات الصحية

هل تناسبك؟
[أشترك] [لا أشارك] [أشارك بشرط]
```

**الواقع الحالي:** `subscriptions/page.tsx` يُتيح الاشتراك عبر اختيار الكيان والمسار مباشرة دون عرض ملخص "شروط المشاركة" أو `RuleSummaryPanel` قبل التأكيد. هذا يتعارض مع مبدأ "أشارك بشرط" الجوهري في الفلسفة.

---

### ج.5 واجهة تغيير القواعد مع بيان الأثر

**المطلوب من الوثيقة:**
```
تغيير حوكمة محفظة الطوارئ

القديم: لجنة من 3 أعضاء
الجديد: قرار فردي بسقف 1,000 ريال

الأثر المتوقع:
- 43 عضواً سيحتاجون مراجعة الشروط
- 8 أعضاء اشترطوا لجنة فقط وقد يصبحون غير متوافقين
- يبدأ التطبيق: بعد موافقة الأغلبية
```

**الواقع الحالي:** `wallets/[id]/page.tsx` و `rules/page.tsx` يعرضان القواعد الحالية ويسمحان بتعديلها، لكن لا يوجد حساب أثر التغيير أو تحذير بعدد الأعضاء المتأثرين.

---

### ج.6 "Guided Policy Wizard" لإعداد قواعد المحفظة

**المطلوب من الوثيقة:**
```
إعداد محفظة جديدة

من يساهم؟
[كل الأعضاء] ○ [فئة محددة] ○ [اختياري]

من يستفيد؟
[كل الأعضاء] ○ [الأعضاء المعتمدون فقط] ○ [حسب لجنة]

من يوافق على الصرف؟
[أمين الصندوق] ○ [لجنة] ○ [تصويت] ○ [مسار مخصص]

من يرى تفاصيل الصرف؟
[الإدارة فقط] ○ [الأعضاء يرون ملخصاً] ○ [شفافية كاملة]
```

**الواقع الحالي:** واجهة `wallets` و `rules` تقنية مباشرة. لا يوجد "Guided Questions" يترجم الإجابات لقواعد في قاعدة البيانات.

**قرار مؤجل عمداً:** `Philosophy.md` نفسها تقول "لا تبدأ بـ Rule Builder كامل — ابدأ بـ Guided Policy Wizard" وهذا صحيح للـ MVP التالي.

---

## القسم د — قرارات تصميم مؤجلة بوعي 🔵

هذه بنود ذُكرت في الوثائق وقُرِّر تأجيلها بشكل واعٍ لما بعد MVP:

| البند | السبب |
|---|---|
| SMS OTP | مؤجل لما بعد إنتاج النسخة الأولى |
| تطبيق React Native | الويب المستجيب يكفي للمرحلة الأولى |
| بوابة دفع إلكتروني | الدفع اليدوي + رفع الإيصال كافٍ الآن |
| WhatsApp API | يُدرس بعد الإطلاق |
| تقارير متقدمة | `analytics/page.tsx` يغطي الحد الأدنى |
| Rule Builder كامل | يُستبدل بـ Guided Policy Wizard في المرحلة التالية |
| الثنائية اللغوية الكاملة | عربي أولاً — الإنجليزية لاحقاً |

---

## القسم هـ — أولويات التنفيذ المقترحة

ترتيباً حسب **أثر الثقة الاجتماعية** لا أثر التقنية:

### الأولوية 1 — يُغلق أسئلة "وين وصل طلبي؟"
**Timeline component** — مكوّن واحد يُحقن في 5 صفحات:
1. `disbursement-requests` — مراحل الطلب (إنشاء ← مراجعة ← موافقة ← تنفيذ)
2. `disputes/[id]` — مراحل النزاع (فتح ← وساطة ← حل)
3. `entities/[id]/members` (تبويب التطبيقات) — مراحل طلب الانضمام
4. `finance` (عرض الإيصال) — متى رُفع؟ من راجع؟

البيانات كلها موجودة في `createdAt / reviewedAt / status` من الـ API.

---

### الأولوية 2 — يُغلق سؤال "لماذا لا أرى هذا؟"
**VisibilityNotice** — مكوّن بسيط يُضاف كـ wrapper:
```tsx
<VisibilityNotice level="VisibleToCommittee" reason="هذا البند في محفظة علاج حساسة">
  {/* بيانات مخفية */}
</VisibilityNotice>
```
يُضاف في: `disbursement-requests` (اسم المستفيد) + `auditor` (التقارير الحساسة)

---

### الأولوية 3 — يُغلق "لماذا يُطلب مني التصويت هنا؟"
**RuleSummaryPanel** في `decisions/page.tsx` — مرتبطاً بنوع القرار ومسار الموافقة.
البيانات المطلوبة: `decision.decisionType` + قاعدة المحفظة المرتبطة (يحتاج endpoint إضافياً أو تضمين البيانات في الـ Decision response).

---

### الأولوية 4 — يُغلق "علام أوافق قبل الاشتراك؟"
**شروط المسار قبل الاشتراك** — شاشة ملخص في `subscriptions/page.tsx` قبل تأكيد الاشتراك:
- الاشتراك الشهري
- من يوافق على الصرف؟
- فترة الانتظار للاستفادة
- مستوى الشفافية

البيانات: `GovernancePath` + `PathPolicy` من الـ API

---

### الأولوية 5 — مؤجل للمرحلة التالية
- PaymentMatchPanel كـ dedicated component في مراجعة الإيصال
- AccessReasonPanel (يحتاج backend يُعيد كود خطأ مفصّل)
- واجهة تأثير تغيير القواعد
- Guided Policy Wizard

---

## القسم و — حالة الصفحات الكاملة (جرد شامل)

### صفحات مكتملة وجاهزة للإنتاج ✅

| الصفحة | الوضع |
|---|---|
| `dashboard` | ✅ Action-oriented مع `buildActionItems` |
| `portal` | ✅ WalletContext كامل مع 3 مستويات تأخر |
| `entities` | ✅ قائمة كيانات المستخدم |
| `entities/new` | ✅ Wizard 5-خطوات مع إقرار قانوني |
| `entities/[id]` | ✅ تفاصيل الكيان مع روابط الأعضاء ومركز المراجعات |
| `entities/[id]/members` | ✅ إدارة أعضاء كاملة |
| `entities/[id]/review` | ✅ مركز مراجعات (4 تبويبات) |
| `entities/[id]/platform-access` | ✅ سجل وصول المنصة |
| `decisions` | ✅ تصويت مع CoI warning |
| `join/[token]` | ✅ مسار اعتماد بـ 3 خطوات |
| `profile` | ✅ تعديل البيانات + OTP verification |
| `disbursement-requests` | ✅ CRUD كامل + RuleSummaryPanel |
| `disputes` | ✅ فتح نزاع + عرض الحالة |
| `disputes/[id]` | ✅ تفاصيل النزاع |
| `subscriptions` | ✅ اشتراك في مسار |
| `finance` | ✅ رفع إيصال + مراجعة أمين الصندوق |
| `notifications` | ✅ إشعارات مع mark-as-read |
| `review-center` | ✅ مراجعة متعدد الكيانات |
| `wallets` | ✅ قائمة محافظ |
| `wallets/[id]` | ✅ تفاصيل المحفظة |
| `paths/[id]` | ✅ تفاصيل المسار |
| `analytics` | ✅ مؤشرات صحة الكيان |
| `auditor` | ✅ عرض المراجع |
| `documents` | ✅ إدارة الوثائق |
| `rules` | ✅ قواعد المحافظ |
| `beneficiaries` | ✅ إدارة المستفيدين |
| `committees` | ✅ إدارة اللجان |
| `platform/login` | ✅ دخول فريق المنصة |
| `platform` | ✅ لوحة إدارة المنصة |

### الصفحة الوحيدة المكسورة (تم إصلاحها)

| المشكلة | الإصلاح |
|---|---|
| `portal/pay` — صفحة غير موجودة وبها 4 روابط من `portal` | تحويل الروابط لـ `/finance?tab=payment&dueId=X` + `useSearchParams` في `finance` |

---

## القسم ز — نقاط UX الدقيقة من وثيقة "تفاصيل الثقة"

هذه من `Details_of_confidence_during_daily_use.md` — جُزء منها طُبِّق وجزء لم يُطبَّق:

### طُبِّق ✅
- تأكيد قبل القرارات الحساسة (حذف عضو، رفض طلب) — inline confirm في معظم الصفحات
- عدم الاعتماد على الأيقونات وحدها — كل عنصر UI له نص توضيحي
- أزرار كبيرة مفهومة مع تسميات عربية واضحة
- عبارات "رفض مع توضيح" بدلاً من "Reject"
- "اعتماد" بدلاً من "Approve"، "بانتظار المراجعة" بدلاً من "Pending"

### لم يُطبَّق بعد ❌
- **نظام حالات موحّد (UI Status System)** — كل صفحة تستخدم ألواناً ومصطلحات مختلفة قليلاً. يحتاج ملف مركزي `STATUS_TOKENS.ts`
- **إمكانية نسخ رقم الحساب البنكي** — في `finance` عند رفع الإيصال لا يوجد "نسخ رقم الحساب"
- **قراءة المبلغ بوضوح** — بعض الأماكن تعرض الرقم في جداول صغيرة بدلاً من Typography واضح

---

## خلاصة المطوّر

**لإكمال الفلسفة عملياً، ثلاثة مكوّنات مشتركة تحتاج بناءً:**

```typescript
// 1. Timeline — مكوّن مشترك
<RequestTimeline steps={[
  { label: 'تم إنشاء الطلب', at: '10:30', by: 'أحمد', done: true },
  { label: 'قيد المراجعة', at: null, by: null, done: false, active: true },
  { label: 'الاعتماد النهائي', at: null, by: null, done: false },
]} />

// 2. VisibilityNotice — wrapper للبيانات الحساسة
<VisibilityNotice
  level="VisibleToCommittee"
  message="اسم المستفيد مخفي — المحفظة حساسة حسب سياسة الكيان"
/>

// 3. RuleSummaryPanel — يُحقن في كل إجراء حساس
<RuleSummaryPanel pathId={pathId} context="vote" />
// يعرض: "لماذا يُطلب منك؟ لأنك عضو في لجنة محفظة العلاج..."
```

هذه الثلاثة تُطبّق 80% من "الثقة الاجتماعية" الغائبة الآن.

---

## المراجع الداخلية لهذا القسم

- `Docs/07_Frontend/Philosophy.md`
- `Docs/07_Frontend/Details_of_confidence_during_daily_use.md`
- `Docs/07_Frontend/frontend_refactoring_report.md`
- `Docs/07_Frontend/frontend_design_notes.md`

---

## v2 — نظام قوالب الكيانات + السايدبار المتكيّف (2026-06-23)

> الكود في فرع `v2-development`. الإنتاج لا يزال على `main` (v1.0).
> commit: `3189c03`

### الفلسفة

القالب هو نقطة بداية، ليس قفصاً.
كيان يُنشأ من قالب "صندوق عائلي بسيط" يمكن توسيعه لاحقاً بتفعيل أي وحدة.
`templateId` على الكيان هو مرجع تاريخي فقط، وليس قيداً.

---

### 1. نظام قوالب الكيانات (Entity Templates)

#### التغييرات في قاعدة البيانات
```
EntityTemplate:
  + icon            String?
  + isActive        Boolean @default(true)
  + sortOrder       Int @default(0)
  + enabledModules  Json?   — مصفوفة الوحدات الافتراضية (مثل ["payments","beneficiaries"])
  + suggestedGoals  Json?

Entity:
  + templateId      String? @db.Uuid  (FK → entity_templates, ON DELETE SET NULL)
  + enabledModules  Json?   — نسخة مستقلة قابلة للتعديل
```

Migration: `backend/prisma/migrations/20260623120000_add_template_modules/migration.sql`

#### القوالب الخمسة المبدئية (في seed)

| القالب | النوع | الوحدات المبدئية |
|---|---|---|
| 🏠 صندوق عائلي | FAMILY | payments, beneficiaries |
| 🕌 مجموعة مسجد / حي | NEIGHBORHOOD | payments, decisions, beneficiaries |
| 🤝 أصدقاء / زملاء | COMMUNITY | payments |
| ⏳ صندوق مؤقت | CAMPAIGN | payments, beneficiaries |
| 🏛️ تعاونية / جمعية | COMMUNITY | payments, decisions, committees, beneficiaries, auditor |

#### Backend
- `entity-templates.service.ts` — CRUD كامل (findAll/findOne/create/update/remove)
- `entity-templates.controller.ts` — GET (JwtGuard)، POST/PATCH/DELETE (PlatformGuard)
- `entities.service.ts`:
  - `createEntity` — يُعيّن `templateId` و`enabledModules` من القالب عند الإنشاء
  - `updateEntityModules` — endpoint جديد `PATCH /entities/:id/modules`
- `entities.controller.ts` — أضيف `PATCH :id/modules`

#### Frontend
- `platform/templates/page.tsx` — واجهة CRUD كاملة لإدارة القوالب (للمشغّل)
- `entities/new/page.tsx` — معالج 3 خطوات: (1) اختيار قالب (2) تسمية (3) مراجعة + قانوني
- قالب `__custom__` يتيح اختيار النوع وجميع الوحدات يدوياً

---

### 2. السايدبار المتكيّف (Adaptive Sidebar)

#### المبدأ
بدلاً من إظهار كل بنود التنقل لكل المستخدمين، يُحسب الـ AppShell مجموع (union) وحدات كل كيانات المستخدم ويُخفي الأقسام غير المُفعَّلة.

#### ROUTE_MODULE — ربط كل مسار بوحدته

| المسار | الوحدة |
|---|---|
| /finance, /subscriptions, /wallets | payments |
| /decisions | decisions |
| /committees, /review-center | committees |
| /beneficiaries, /disbursements, /disbursement-requests | beneficiaries |
| /auditor, /analytics | auditor |
| /rules, /paths | governance |
| /documents | documents |
| /disputes | disputes |
| /dashboard, /portal, /entities, /notifications, /health | (core — دائمة) |

#### منطق الـ union
```
if (لا توجد كيانات) → اعرض المسارات الأساسية فقط
if (أي كيان له enabledModules=null) → اعرض كل شيء
else → اعرض union كل enabledModules عبر جميع كيانات المستخدم
```

#### إعدادات الكيان — قسم الوحدات
في `entities/[id]/settings/page.tsx`:
- بطاقات toggle لـ 8 وحدات (payments, decisions, committees, beneficiaries, auditor, governance, documents, disputes)
- الحفظ يُرسل `PATCH /entities/:id/modules`
- مؤسس / مدير الكيان فقط

---

### الحالة والخطوات التالية

| المهمة | الحالة |
|---|---|
| Entity Templates — Backend + Seed | ✅ مكتمل |
| Entity Templates — Frontend (Platform CRUD) | ✅ مكتمل |
| Entity Templates — معالج الإنشاء 3 خطوات | ✅ مكتمل |
| Adaptive Sidebar — AppShell | ✅ مكتمل |
| Modules Settings — صفحة الإعدادات | ✅ مكتمل |
| تطبيق الـ migration على الإنتاج | ⏳ عند إطلاق v2 |
| زرع القوالب على الإنتاج | ⏳ عند إطلاق v2 |
| اختبار end-to-end لتجربة الإنشاء بالقالب | ⏳ قبل إطلاق v2 |
- `Docs/05_Rules_and_Governance/access_control_and_privacy.md` (مستويات الشفافية الستة)
