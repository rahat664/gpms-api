# Prisma ER Diagram

```mermaid
erDiagram
  Factory {
    string id PK
    string code UK
    string name
  }
  User {
    string id PK
    string email UK
    string role
  }
  UserFactoryAccess {
    string id PK
    string userId FK
    string factoryId FK
  }
  Buyer {
    string id PK
    string factoryId FK
  }
  Style {
    string id PK
    string factoryId FK
  }
  PurchaseOrder {
    string id PK
    string factoryId FK
    string buyerId FK
    string poNo
  }
  POItem {
    string id PK
    string factoryId FK
    string poId FK
    string styleId FK
  }
  Material {
    string id PK
    string factoryId FK
  }
  BOMHeader {
    string id PK
    string factoryId FK
    string styleId FK_UK
  }
  BOMItem {
    string id PK
    string bomId FK
    string materialId FK
  }
  InventoryTxn {
    string id PK
    string factoryId FK
    string materialId FK
  }
  AuditLog {
    string id PK
    string factoryId FK
    string userId FK
    string materialId FK_nullable
  }
  SewingLine {
    string id PK
    string factoryId FK
  }
  ProductionPlan {
    string id PK
    string factoryId FK
  }
  PlanLine {
    string id PK
    string factoryId FK
    string planId FK
    string poId FK
    string poItemId FK
    string lineId FK
  }
  DailyTarget {
    string id PK
    string planLineId FK
  }
  CuttingBatch {
    string id PK
    string factoryId FK
    string poItemId FK
  }
  Bundle {
    string id PK
    string factoryId FK
    string poItemId FK
    string batchId FK
  }
  SewingHourlyOutput {
    string id PK
    string factoryId FK
    string lineId FK
    string bundleId FK_nullable
  }
  QCInspection {
    string id PK
    string factoryId FK
    string bundleId FK
  }
  QCDefect {
    string id PK
    string inspectionId FK
  }

  Factory ||--o{ UserFactoryAccess : has
  User ||--o{ UserFactoryAccess : has

  Factory ||--o{ Buyer : has
  Factory ||--o{ Style : has
  Factory ||--o{ PurchaseOrder : has
  Factory ||--o{ POItem : has
  Factory ||--o{ Material : has
  Factory ||--o{ BOMHeader : has
  Factory ||--o{ InventoryTxn : has
  Factory ||--o{ AuditLog : has
  Factory ||--o{ SewingLine : has
  Factory ||--o{ ProductionPlan : has
  Factory ||--o{ PlanLine : has
  Factory ||--o{ CuttingBatch : has
  Factory ||--o{ Bundle : has
  Factory ||--o{ SewingHourlyOutput : has
  Factory ||--o{ QCInspection : has

  Buyer ||--o{ PurchaseOrder : places
  PurchaseOrder ||--o{ POItem : contains
  Style ||--o{ POItem : used_by

  Style ||--o| BOMHeader : has
  BOMHeader ||--o{ BOMItem : contains
  Material ||--o{ BOMItem : used_in

  Material ||--o{ InventoryTxn : transacted_in
  User ||--o{ AuditLog : performs
  Material ||--o{ AuditLog : referenced_by

  ProductionPlan ||--o{ PlanLine : has
  PurchaseOrder ||--o{ PlanLine : includes
  POItem ||--o{ PlanLine : schedules
  SewingLine ||--o{ PlanLine : assigned_to
  PlanLine ||--o{ DailyTarget : has

  POItem ||--o{ CuttingBatch : cut_into
  CuttingBatch ||--o{ Bundle : contains
  POItem ||--o{ Bundle : from_item

  SewingLine ||--o{ SewingHourlyOutput : outputs
  Bundle ||--o{ SewingHourlyOutput : tracks

  Bundle ||--o{ QCInspection : inspected_in
  QCInspection ||--o{ QCDefect : has
```

