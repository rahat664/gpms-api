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
    s[Backend_Process_Deep_Dive.pdf](Backend_Process_Deep_Dive.pdf)tring id PK
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
    string styleId FK
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
  User ||--o{ UserFactoryAccess : access

  Factory ||--o{ Buyer : has
  Factory ||--o{ Style : has
  Factory ||--o{ PurchaseOrder : has
  Factory ||--o{ Material : has

  Buyer ||--o{ PurchaseOrder : places
  PurchaseOrder ||--o{ POItem : contains
  Style ||--o{ POItem : used_in

  Style ||--|| BOMHeader : has
  BOMHeader ||--o{ BOMItem : contains
  Material ||--o{ BOMItem : used_in

  Material ||--o{ InventoryTxn : transaction

  User ||--o{ AuditLog : performs

  Factory ||--o{ SewingLine : has
  Factory ||--o{ ProductionPlan : has

  ProductionPlan ||--o{ PlanLine : includes
  PurchaseOrder ||--o{ PlanLine : used_for
  POItem ||--o{ PlanLine : scheduled
  SewingLine ||--o{ PlanLine : assigned

  PlanLine ||--o{ DailyTarget : target

  POItem ||--o{ CuttingBatch : cut
  CuttingBatch ||--o{ Bundle : contains
  POItem ||--o{ Bundle : produces

  SewingLine ||--o{ SewingHourlyOutput : outputs

  Bundle ||--o{ QCInspection : inspected
  QCInspection ||--o{ QCDefect : defects
