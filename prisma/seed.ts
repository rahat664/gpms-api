import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  InspectionType,
  InventoryTxnType,
  POStatus,
  PrismaClient,
  RoleName,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function startOfDay(offsetDays = 0) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date;
}

async function clearFactoryData(factoryId: string) {
  await prisma.qCDefect.deleteMany({
    where: {
      inspection: {
        factoryId,
      },
    },
  });
  await prisma.qCInspection.deleteMany({ where: { factoryId } });
  await prisma.sewingHourlyOutput.deleteMany({ where: { factoryId } });
  await prisma.bundle.deleteMany({ where: { factoryId } });
  await prisma.cuttingBatch.deleteMany({ where: { factoryId } });
  await prisma.dailyTarget.deleteMany({
    where: {
      planLine: {
        factoryId,
      },
    },
  });
  await prisma.planLine.deleteMany({ where: { factoryId } });
  await prisma.productionPlan.deleteMany({ where: { factoryId } });
  await prisma.inventoryTxn.deleteMany({ where: { factoryId } });
  await prisma.bOMItem.deleteMany({
    where: {
      bom: {
        factoryId,
      },
    },
  });
  await prisma.bOMHeader.deleteMany({ where: { factoryId } });
  await prisma.pOItem.deleteMany({ where: { factoryId } });
  await prisma.purchaseOrder.deleteMany({ where: { factoryId } });
  await prisma.style.deleteMany({ where: { factoryId } });
  await prisma.material.deleteMany({ where: { factoryId } });
  await prisma.buyer.deleteMany({ where: { factoryId } });
  await prisma.sewingLine.deleteMany({ where: { factoryId } });
}

async function supportsAuditLog() {
  try {
    await prisma.$queryRawUnsafe('SELECT 1 FROM "AuditLog" LIMIT 1');
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const password = await bcrypt.hash("admin123", 10);
  const hasAuditLog = await supportsAuditLog();
  const today = startOfDay(0);
  const yesterday = startOfDay(-1);
  const tomorrow = startOfDay(1);

  const primaryFactory = await prisma.factory.upsert({
    where: { code: "F001" },
    update: { name: "Demo Garments Factory" },
    create: { name: "Demo Garments Factory", code: "F001" },
  });

  const secondaryFactory = await prisma.factory.upsert({
    where: { code: "F002" },
    update: { name: "Demo Knit Factory" },
    create: { name: "Demo Knit Factory", code: "F002" },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@gpms.com" },
    update: {
      name: "Admin User",
      password,
      role: RoleName.ADMIN,
    },
    create: {
      email: "admin@gpms.com",
      name: "Admin User",
      password,
      role: RoleName.ADMIN,
    },
  });

  for (const factory of [primaryFactory, secondaryFactory]) {
    await prisma.userFactoryAccess.upsert({
      where: {
        userId_factoryId: {
          userId: admin.id,
          factoryId: factory.id,
        },
      },
      update: {},
      create: { userId: admin.id, factoryId: factory.id },
    });
  }

  await clearFactoryData(primaryFactory.id);

  const [line1, line2, line3] = await Promise.all([
    prisma.sewingLine.create({
      data: { factoryId: primaryFactory.id, name: "Line A", capacityPerDay: 1400 },
    }),
    prisma.sewingLine.create({
      data: { factoryId: primaryFactory.id, name: "Line B", capacityPerDay: 1250 },
    }),
    prisma.sewingLine.create({
      data: { factoryId: primaryFactory.id, name: "Line C", capacityPerDay: 1180 },
    }),
  ]);

  const [buyer1, buyer2, buyer3] = await Promise.all([
    prisma.buyer.create({
      data: { factoryId: primaryFactory.id, name: "H&M", country: "Sweden" },
    }),
    prisma.buyer.create({
      data: { factoryId: primaryFactory.id, name: "Zara", country: "Spain" },
    }),
    prisma.buyer.create({
      data: { factoryId: primaryFactory.id, name: "Mango", country: "Spain" },
    }),
  ]);

  const [fabric, rib, thread, polybag] = await Promise.all([
    prisma.material.create({
      data: {
        factoryId: primaryFactory.id,
        name: "Cotton Jersey 180 GSM",
        type: "FABRIC",
        uom: "KG",
      },
    }),
    prisma.material.create({
      data: {
        factoryId: primaryFactory.id,
        name: "Rib 1x1",
        type: "TRIM",
        uom: "KG",
      },
    }),
    prisma.material.create({
      data: {
        factoryId: primaryFactory.id,
        name: "Core Spun Thread",
        type: "TRIM",
        uom: "CONE",
      },
    }),
    prisma.material.create({
      data: {
        factoryId: primaryFactory.id,
        name: "Recycled Polybag",
        type: "PACKING",
        uom: "PCS",
      },
    }),
  ]);

  const [style1, style2, style3] = await Promise.all([
    prisma.style.create({
      data: {
        factoryId: primaryFactory.id,
        styleNo: "ST-1001",
        name: "Essential Tee",
        season: "SS26",
      },
    }),
    prisma.style.create({
      data: {
        factoryId: primaryFactory.id,
        styleNo: "ST-2040",
        name: "Raglan Sweat",
        season: "FW26",
      },
    }),
    prisma.style.create({
      data: {
        factoryId: primaryFactory.id,
        styleNo: "ST-3100",
        name: "Pique Polo",
        season: "SS26",
      },
    }),
  ]);

  for (const [style, items] of [
    [
      style1,
      [
        { materialId: fabric.id, consumption: 0.42 },
        { materialId: thread.id, consumption: 0.03 },
        { materialId: polybag.id, consumption: 1 },
      ],
    ],
    [
      style2,
      [
        { materialId: fabric.id, consumption: 0.71 },
        { materialId: rib.id, consumption: 0.08 },
        { materialId: thread.id, consumption: 0.04 },
      ],
    ],
    [
      style3,
      [
        { materialId: fabric.id, consumption: 0.55 },
        { materialId: thread.id, consumption: 0.03 },
        { materialId: polybag.id, consumption: 1 },
      ],
    ],
  ] as const) {
    const bom = await prisma.bOMHeader.create({
      data: {
        factoryId: primaryFactory.id,
        styleId: style.id,
      },
    });

    await prisma.bOMItem.createMany({
      data: items.map((item) => ({
        bomId: bom.id,
        materialId: item.materialId,
        consumption: item.consumption,
      })),
    });
  }

  await prisma.inventoryTxn.createMany({
    data: [
      {
        factoryId: primaryFactory.id,
        materialId: fabric.id,
        type: InventoryTxnType.IN,
        qty: 1800,
        refType: "GRN",
        refId: "GRN-1001",
      },
      {
        factoryId: primaryFactory.id,
        materialId: rib.id,
        type: InventoryTxnType.IN,
        qty: 180,
        refType: "GRN",
        refId: "GRN-1002",
      },
      {
        factoryId: primaryFactory.id,
        materialId: thread.id,
        type: InventoryTxnType.IN,
        qty: 220,
        refType: "GRN",
        refId: "GRN-1003",
      },
      {
        factoryId: primaryFactory.id,
        materialId: polybag.id,
        type: InventoryTxnType.IN,
        qty: 10000,
        refType: "GRN",
        refId: "GRN-1004",
      },
      {
        factoryId: primaryFactory.id,
        materialId: fabric.id,
        type: InventoryTxnType.OUT,
        qty: 240,
        refType: "ISSUE_CUTTING",
        refId: "CUT-9001",
      },
    ],
  });

  const po1 = await prisma.purchaseOrder.create({
    data: {
      factoryId: primaryFactory.id,
      buyerId: buyer1.id,
      poNo: "PO-260301",
      status: POStatus.CONFIRMED,
    },
  });
  const po2 = await prisma.purchaseOrder.create({
    data: {
      factoryId: primaryFactory.id,
      buyerId: buyer2.id,
      poNo: "PO-260302",
      status: POStatus.IN_PRODUCTION,
    },
  });
  const po3 = await prisma.purchaseOrder.create({
    data: {
      factoryId: primaryFactory.id,
      buyerId: buyer3.id,
      poNo: "PO-260303",
      status: POStatus.DRAFT,
    },
  });

  const [poItem1, poItem2, poItem3, poItem4] = await Promise.all([
    prisma.pOItem.create({
      data: {
        factoryId: primaryFactory.id,
        poId: po1.id,
        styleId: style1.id,
        color: "Black",
        quantity: 1800,
      },
    }),
    prisma.pOItem.create({
      data: {
        factoryId: primaryFactory.id,
        poId: po1.id,
        styleId: style3.id,
        color: "Navy",
        quantity: 1200,
      },
    }),
    prisma.pOItem.create({
      data: {
        factoryId: primaryFactory.id,
        poId: po2.id,
        styleId: style2.id,
        color: "Heather Grey",
        quantity: 1500,
      },
    }),
    prisma.pOItem.create({
      data: {
        factoryId: primaryFactory.id,
        poId: po3.id,
        styleId: style1.id,
        color: "White",
        quantity: 900,
      },
    }),
  ]);

  const plan = await prisma.productionPlan.create({
    data: {
      factoryId: primaryFactory.id,
      name: "Week 10 Execution",
      startDate: yesterday,
      endDate: tomorrow,
    },
  });

  const [planLine1, planLine2, planLine3] = await Promise.all([
    prisma.planLine.create({
      data: {
        factoryId: primaryFactory.id,
        planId: plan.id,
        poId: po1.id,
        poItemId: poItem1.id,
        lineId: line1.id,
        startDate: yesterday,
        endDate: tomorrow,
      },
    }),
    prisma.planLine.create({
      data: {
        factoryId: primaryFactory.id,
        planId: plan.id,
        poId: po2.id,
        poItemId: poItem3.id,
        lineId: line2.id,
        startDate: yesterday,
        endDate: tomorrow,
      },
    }),
    prisma.planLine.create({
      data: {
        factoryId: primaryFactory.id,
        planId: plan.id,
        poId: po1.id,
        poItemId: poItem2.id,
        lineId: line3.id,
        startDate: today,
        endDate: tomorrow,
      },
    }),
  ]);

  await prisma.dailyTarget.createMany({
    data: [
      { planLineId: planLine1.id, date: yesterday, targetQty: 420 },
      { planLineId: planLine1.id, date: today, targetQty: 580 },
      { planLineId: planLine1.id, date: tomorrow, targetQty: 500 },
      { planLineId: planLine2.id, date: yesterday, targetQty: 360 },
      { planLineId: planLine2.id, date: today, targetQty: 520 },
      { planLineId: planLine2.id, date: tomorrow, targetQty: 470 },
      { planLineId: planLine3.id, date: today, targetQty: 430 },
      { planLineId: planLine3.id, date: tomorrow, targetQty: 410 },
    ],
  });

  const batch1 = await prisma.cuttingBatch.create({
    data: {
      factoryId: primaryFactory.id,
      poItemId: poItem1.id,
      batchNo: "CB-1001",
    },
  });
  const batch2 = await prisma.cuttingBatch.create({
    data: {
      factoryId: primaryFactory.id,
      poItemId: poItem3.id,
      batchNo: "CB-1002",
    },
  });

  const bundles = await Promise.all([
    prisma.bundle.create({
      data: {
        factoryId: primaryFactory.id,
        poItemId: poItem1.id,
        batchId: batch1.id,
        bundleCode: "BND-F001-CB-1001-0001",
        size: "M",
        qty: 120,
        status: "QC_PASS",
      },
    }),
    prisma.bundle.create({
      data: {
        factoryId: primaryFactory.id,
        poItemId: poItem1.id,
        batchId: batch1.id,
        bundleCode: "BND-F001-CB-1001-0002",
        size: "L",
        qty: 140,
        status: "QC_FAIL",
      },
    }),
    prisma.bundle.create({
      data: {
        factoryId: primaryFactory.id,
        poItemId: poItem3.id,
        batchId: batch2.id,
        bundleCode: "BND-F001-CB-1002-0001",
        size: "M",
        qty: 110,
        status: "IN_LINE",
      },
    }),
    prisma.bundle.create({
      data: {
        factoryId: primaryFactory.id,
        poItemId: poItem3.id,
        batchId: batch2.id,
        bundleCode: "BND-F001-CB-1002-0002",
        size: "L",
        qty: 130,
        status: "SEWN",
      },
    }),
    prisma.bundle.create({
      data: {
        factoryId: primaryFactory.id,
        poItemId: poItem2.id,
        batchId: batch1.id,
        bundleCode: "BND-F001-CB-1001-0003",
        size: "S",
        qty: 100,
        status: "CUT",
      },
    }),
  ]);

  await prisma.sewingHourlyOutput.createMany({
    data: [
      { factoryId: primaryFactory.id, lineId: line1.id, bundleId: bundles[0].id, date: today, hourSlot: 8, qty: 92 },
      { factoryId: primaryFactory.id, lineId: line1.id, bundleId: bundles[0].id, date: today, hourSlot: 9, qty: 110 },
      { factoryId: primaryFactory.id, lineId: line1.id, bundleId: bundles[1].id, date: today, hourSlot: 10, qty: 96 },
      { factoryId: primaryFactory.id, lineId: line2.id, bundleId: bundles[2].id, date: today, hourSlot: 8, qty: 78 },
      { factoryId: primaryFactory.id, lineId: line2.id, bundleId: bundles[3].id, date: today, hourSlot: 9, qty: 102 },
      { factoryId: primaryFactory.id, lineId: line2.id, bundleId: bundles[3].id, date: today, hourSlot: 10, qty: 118 },
      { factoryId: primaryFactory.id, lineId: line3.id, bundleId: bundles[4].id, date: today, hourSlot: 8, qty: 66 },
      { factoryId: primaryFactory.id, lineId: line3.id, bundleId: bundles[4].id, date: today, hourSlot: 9, qty: 81 },
      { factoryId: primaryFactory.id, lineId: line1.id, bundleId: bundles[0].id, date: yesterday, hourSlot: 8, qty: 88 },
      { factoryId: primaryFactory.id, lineId: line2.id, bundleId: bundles[2].id, date: yesterday, hourSlot: 8, qty: 73 },
    ],
  });

  const inspection1 = await prisma.qCInspection.create({
    data: {
      factoryId: primaryFactory.id,
      bundleId: bundles[0].id,
      type: InspectionType.INLINE,
      pass: true,
      notes: "Clean stitching and balanced SPI",
      createdAt: today,
    },
  });
  const inspection2 = await prisma.qCInspection.create({
    data: {
      factoryId: primaryFactory.id,
      bundleId: bundles[1].id,
      type: InspectionType.ENDLINE,
      pass: false,
      notes: "Need rework before pack",
      createdAt: today,
    },
  });
  const inspection3 = await prisma.qCInspection.create({
    data: {
      factoryId: primaryFactory.id,
      bundleId: bundles[3].id,
      type: InspectionType.FINAL,
      pass: true,
      notes: "Approved for shipment flow",
      createdAt: today,
    },
  });

  await prisma.qCDefect.createMany({
    data: [
      { inspectionId: inspection2.id, defectType: "Open seam", count: 4 },
      { inspectionId: inspection2.id, defectType: "Skip stitch", count: 2 },
      { inspectionId: inspection2.id, defectType: "Oil spot", count: 1 },
    ],
  });

  if (hasAuditLog) {
    await prisma.auditLog.createMany({
      data: [
        {
          factoryId: primaryFactory.id,
          userId: admin.id,
          materialId: fabric.id,
          action: "SEED_INVENTORY_RECEIVE",
          entityType: "InventoryTxn",
          entityId: "seed-in-1",
        },
        {
          factoryId: primaryFactory.id,
          userId: admin.id,
          materialId: fabric.id,
          action: "SEED_INVENTORY_ISSUE",
          entityType: "InventoryTxn",
          entityId: "seed-out-1",
        },
      ],
    });
  }

  await clearFactoryData(secondaryFactory.id);
  await prisma.sewingLine.createMany({
    data: [
      { factoryId: secondaryFactory.id, name: "Line K1", capacityPerDay: 820 },
      { factoryId: secondaryFactory.id, name: "Line K2", capacityPerDay: 860 },
    ],
  });
  await prisma.buyer.create({
    data: { factoryId: secondaryFactory.id, name: "Uniqlo", country: "Japan" },
  });

  console.log("Seed completed successfully.");
  console.log("Login with admin@gpms.com / admin123");
  console.log(`Primary factory: ${primaryFactory.code}`);
  console.log(`Secondary factory: ${secondaryFactory.code}`);
  console.log(`QC inspections created: ${[inspection1.id, inspection2.id, inspection3.id].length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
