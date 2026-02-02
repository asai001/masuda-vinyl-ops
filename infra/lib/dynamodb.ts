import { RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

type TableWithKeys = {
  table: Table;
};

type DeployEnv = "dev" | "prod";

interface DynamoDbResourcesProps {
  deployEnv: DeployEnv;
}

export class DynamoDbResources extends Construct {
  public readonly settingsTable: dynamodb.Table;
  public readonly clientsMasterTable: dynamodb.Table;
  public readonly materialsMasterTable: dynamodb.Table;
  public readonly productsMasterTable: dynamodb.Table;
  public readonly productMaterialLinksTable: dynamodb.Table;
  public readonly purchaseOrdersTable: dynamodb.Table;
  public readonly salesOrdersTable: dynamodb.Table;
  public readonly paymentDefinitionsTable: dynamodb.Table;
  public readonly paymentsTable: dynamodb.Table;
  public readonly sequencesTable: dynamodb.Table;

  private readonly pointInTimeRecoveryEnabled: boolean;

  constructor(scope: Construct, id: string, props: DynamoDbResourcesProps) {
    super(scope, id);

    this.pointInTimeRecoveryEnabled = props.deployEnv === "prod";
    const removalPolicy = this.pointInTimeRecoveryEnabled ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;

    // ---- clients ----
    const clientsMaster = this.createTable({
      tableName: "clients-master",
      pk: { name: "orgId", type: dynamodb.AttributeType.STRING },
      sk: { name: "clientId", type: dynamodb.AttributeType.STRING },
      removalPolicy,
    });

    // category / region / currency / status: orgId#xxx で1発Queryできるように
    clientsMaster.table.addGlobalSecondaryIndex({
      indexName: "ClientsByCategoryIndex",
      partitionKey: { name: "categoryIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${category}`
      sortKey: { name: "categoryIndexSk", type: dynamodb.AttributeType.STRING }, // `${nameLower}#${clientId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });
    clientsMaster.table.addGlobalSecondaryIndex({
      indexName: "ClientsByRegionIndex",
      partitionKey: { name: "regionIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${region}`
      sortKey: { name: "regionIndexSk", type: dynamodb.AttributeType.STRING }, // `${nameLower}#${clientId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });
    clientsMaster.table.addGlobalSecondaryIndex({
      indexName: "ClientsByCurrencyIndex",
      partitionKey: { name: "currencyIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${currency}`
      sortKey: { name: "currencyIndexSk", type: dynamodb.AttributeType.STRING }, // `${nameLower}#${clientId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });
    clientsMaster.table.addGlobalSecondaryIndex({
      indexName: "ClientsByStatusIndex",
      partitionKey: { name: "statusIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${status}`
      sortKey: { name: "statusIndexSk", type: dynamodb.AttributeType.STRING }, // `${nameLower}#${clientId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });
    // name 前方一致（begins_with）で検索したい用
    clientsMaster.table.addGlobalSecondaryIndex({
      indexName: "ClientsByNameIndex",
      partitionKey: { name: "nameIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "nameIndexSk", type: dynamodb.AttributeType.STRING }, // `${nameLower}#${clientId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });
    this.clientsMasterTable = clientsMaster.table;

    // ---- materials ----
    const materials = this.createTable({
      tableName: "materials-master",
      pk: { name: "orgId", type: dynamodb.AttributeType.STRING },
      sk: { name: "materialId", type: dynamodb.AttributeType.STRING },
      removalPolicy,
    });
    this.materialsMasterTable = materials.table;

    materials.table.addGlobalSecondaryIndex({
      indexName: "MaterialsByCategoryIndex",
      partitionKey: { name: "categoryIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${category}`
      sortKey: { name: "categoryIndexSk", type: dynamodb.AttributeType.STRING }, // `${codeLower}#${materialId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });
    materials.table.addGlobalSecondaryIndex({
      indexName: "MaterialsBySupplierIndex",
      partitionKey: { name: "supplierIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${supplier}`
      sortKey: { name: "supplierIndexSk", type: dynamodb.AttributeType.STRING }, // `${codeLower}#${materialId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });
    materials.table.addGlobalSecondaryIndex({
      indexName: "MaterialsByUnitIndex",
      partitionKey: { name: "unitIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${unit}`
      sortKey: { name: "unitIndexSk", type: dynamodb.AttributeType.STRING }, // `${codeLower}#${materialId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });
    materials.table.addGlobalSecondaryIndex({
      indexName: "MaterialsByCurrencyIndex",
      partitionKey: { name: "currencyIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${currency}`
      sortKey: { name: "currencyIndexSk", type: dynamodb.AttributeType.STRING }, // `${codeLower}#${materialId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });
    materials.table.addGlobalSecondaryIndex({
      indexName: "MaterialsByStatusIndex",
      partitionKey: { name: "statusIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${status}`
      sortKey: { name: "statusIndexSk", type: dynamodb.AttributeType.STRING }, // `${codeLower}#${materialId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // code/name 検索（前方一致）
    materials.table.addGlobalSecondaryIndex({
      indexName: "MaterialsByCodeIndex",
      partitionKey: { name: "codeIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "codeIndexSk", type: dynamodb.AttributeType.STRING }, // `${codeLower}#${materialId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });
    materials.table.addGlobalSecondaryIndex({
      indexName: "MaterialsByNameIndex",
      partitionKey: { name: "nameIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "nameIndexSk", type: dynamodb.AttributeType.STRING }, // `${nameLower}#${materialId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // unitPrice レンジ（Number）
    materials.table.addGlobalSecondaryIndex({
      indexName: "MaterialsByUnitPriceIndex",
      partitionKey: { name: "unitPriceIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "unitPriceIndexSk", type: dynamodb.AttributeType.NUMBER }, // unitPrice
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ---- products ----
    const products = this.createTable({
      tableName: "products-master",
      pk: { name: "orgId", type: dynamodb.AttributeType.STRING },
      sk: { name: "productId", type: dynamodb.AttributeType.STRING },
      removalPolicy,
    });
    this.productsMasterTable = products.table;

    products.table.addGlobalSecondaryIndex({
      indexName: "ProductsByCategoryIndex",
      partitionKey: { name: "categoryIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${category}`
      sortKey: { name: "categoryIndexSk", type: dynamodb.AttributeType.STRING }, // `${codeLower}#${productId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });
    products.table.addGlobalSecondaryIndex({
      indexName: "ProductsByUnitIndex",
      partitionKey: { name: "unitIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${unit}`
      sortKey: { name: "unitIndexSk", type: dynamodb.AttributeType.STRING }, // `${codeLower}#${productId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });
    products.table.addGlobalSecondaryIndex({
      indexName: "ProductsByCurrencyIndex",
      partitionKey: { name: "currencyIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${currency}`
      sortKey: { name: "currencyIndexSk", type: dynamodb.AttributeType.STRING }, // `${codeLower}#${productId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });
    products.table.addGlobalSecondaryIndex({
      indexName: "ProductsByStatusIndex",
      partitionKey: { name: "statusIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${status}`
      sortKey: { name: "statusIndexSk", type: dynamodb.AttributeType.STRING }, // `${codeLower}#${productId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });

    products.table.addGlobalSecondaryIndex({
      indexName: "ProductsByCodeIndex",
      partitionKey: { name: "codeIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "codeIndexSk", type: dynamodb.AttributeType.STRING }, // `${codeLower}#${productId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });
    products.table.addGlobalSecondaryIndex({
      indexName: "ProductsByNameIndex",
      partitionKey: { name: "nameIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "nameIndexSk", type: dynamodb.AttributeType.STRING }, // `${nameLower}#${productId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // unitPrice / weight / length / speed レンジ（Number）
    products.table.addGlobalSecondaryIndex({
      indexName: "ProductsByUnitPriceIndex",
      partitionKey: { name: "unitPriceIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "unitPriceIndexSk", type: dynamodb.AttributeType.NUMBER }, // unitPrice
      projectionType: dynamodb.ProjectionType.ALL,
    });
    products.table.addGlobalSecondaryIndex({
      indexName: "ProductsByWeightIndex",
      partitionKey: { name: "weightIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "weightIndexSk", type: dynamodb.AttributeType.NUMBER }, // weight
      projectionType: dynamodb.ProjectionType.ALL,
    });
    products.table.addGlobalSecondaryIndex({
      indexName: "ProductsByLengthIndex",
      partitionKey: { name: "lengthIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "lengthIndexSk", type: dynamodb.AttributeType.NUMBER }, // length
      projectionType: dynamodb.ProjectionType.ALL,
    });
    products.table.addGlobalSecondaryIndex({
      indexName: "ProductsBySpeedIndex",
      partitionKey: { name: "speedIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "speedIndexSk", type: dynamodb.AttributeType.NUMBER }, // speed
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ---- product_material_links（材料→製品の逆引き用）----
    // 「使用材料」で製品を引くのは配列だけだとQueryしにくいのでリンクテーブルを切る
    const productMaterialLinks = this.createTable({
      tableName: "product-material-links",
      pk: { name: "materialLinkPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${materialCode}`
      sk: { name: "productId", type: dynamodb.AttributeType.STRING },
      removalPolicy,
    });
    this.productMaterialLinksTable = productMaterialLinks.table;

    // ---- purchase_orders ----
    const purchaseOrders = this.createTable({
      tableName: "purchase-orders",
      pk: { name: "orgId", type: dynamodb.AttributeType.STRING },
      sk: { name: "purchaseOrderId", type: dynamodb.AttributeType.STRING },
      removalPolicy,
    });
    this.purchaseOrdersTable = purchaseOrders.table;

    // 発注日レンジ
    purchaseOrders.table.addGlobalSecondaryIndex({
      indexName: "PurchaseOrdersByOrderDateIndex",
      partitionKey: { name: "orderDateIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "orderDateIndexSk", type: dynamodb.AttributeType.STRING }, // orderDate (YYYY-MM-DD)
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 納期レンジ
    purchaseOrders.table.addGlobalSecondaryIndex({
      indexName: "PurchaseOrdersByDeliveryDateIndex",
      partitionKey: { name: "deliveryDateIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "deliveryDateIndexSk", type: dynamodb.AttributeType.STRING }, // deliveryDate (YYYY-MM-DD)
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 取引先
    purchaseOrders.table.addGlobalSecondaryIndex({
      indexName: "PurchaseOrdersBySupplierIndex",
      partitionKey: { name: "supplierIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${supplier}`
      sortKey: { name: "supplierIndexSk", type: dynamodb.AttributeType.STRING }, // orderDate
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ステータス（スパース運用推奨：trueのときだけ属性を入れる）
    purchaseOrders.table.addGlobalSecondaryIndex({
      indexName: "PurchaseOrdersByOrderedStatusIndex",
      partitionKey: { name: "orderedStatusIndexPk", type: dynamodb.AttributeType.STRING }, // orgId (ordered=true の時だけセット)
      sortKey: { name: "orderedStatusIndexSk", type: dynamodb.AttributeType.STRING }, // orderDate
      projectionType: dynamodb.ProjectionType.ALL,
    });
    purchaseOrders.table.addGlobalSecondaryIndex({
      indexName: "PurchaseOrdersByDeliveredStatusIndex",
      partitionKey: { name: "deliveredStatusIndexPk", type: dynamodb.AttributeType.STRING }, // orgId (delivered=true の時だけセット)
      sortKey: { name: "deliveredStatusIndexSk", type: dynamodb.AttributeType.STRING }, // orderDate
      projectionType: dynamodb.ProjectionType.ALL,
    });
    purchaseOrders.table.addGlobalSecondaryIndex({
      indexName: "PurchaseOrdersByPaidStatusIndex",
      partitionKey: { name: "paidStatusIndexPk", type: dynamodb.AttributeType.STRING }, // orgId (paid=true の時だけセット)
      sortKey: { name: "paidStatusIndexSk", type: dynamodb.AttributeType.STRING }, // orderDate
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 書類状況（同様にスパース）
    purchaseOrders.table.addGlobalSecondaryIndex({
      indexName: "PurchaseOrdersByOrderSentIndex",
      partitionKey: { name: "orderSentIndexPk", type: dynamodb.AttributeType.STRING }, // orgId (orderSent=true の時だけ)
      sortKey: { name: "orderSentIndexSk", type: dynamodb.AttributeType.STRING }, // orderDate
      projectionType: dynamodb.ProjectionType.ALL,
    });
    purchaseOrders.table.addGlobalSecondaryIndex({
      indexName: "PurchaseOrdersByDeliveryReceivedIndex",
      partitionKey: { name: "deliveryReceivedIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "deliveryReceivedIndexSk", type: dynamodb.AttributeType.STRING }, // orderDate
      projectionType: dynamodb.ProjectionType.ALL,
    });
    purchaseOrders.table.addGlobalSecondaryIndex({
      indexName: "PurchaseOrdersByInvoiceReceivedIndex",
      partitionKey: { name: "invoiceReceivedIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "invoiceReceivedIndexSk", type: dynamodb.AttributeType.STRING }, // orderDate
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ---- sales_orders ----
    const salesOrders = this.createTable({
      tableName: "sales-orders",
      pk: { name: "orgId", type: dynamodb.AttributeType.STRING },
      sk: { name: "salesOrderId", type: dynamodb.AttributeType.STRING },
      removalPolicy,
    });
    this.salesOrdersTable = salesOrders.table;

    salesOrders.table.addGlobalSecondaryIndex({
      indexName: "SalesOrdersByOrderDateIndex",
      partitionKey: { name: "orderDateIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "orderDateIndexSk", type: dynamodb.AttributeType.STRING }, // orderDate
      projectionType: dynamodb.ProjectionType.ALL,
    });
    salesOrders.table.addGlobalSecondaryIndex({
      indexName: "SalesOrdersByDeliveryDateIndex",
      partitionKey: { name: "deliveryDateIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "deliveryDateIndexSk", type: dynamodb.AttributeType.STRING }, // deliveryDate
      projectionType: dynamodb.ProjectionType.ALL,
    });

    salesOrders.table.addGlobalSecondaryIndex({
      indexName: "SalesOrdersByCustomerIndex",
      partitionKey: { name: "customerIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${customerName}`
      sortKey: { name: "customerIndexSk", type: dynamodb.AttributeType.STRING }, // orderDate
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // PO NO.（orderNo前方一致）
    salesOrders.table.addGlobalSecondaryIndex({
      indexName: "SalesOrdersByOrderNoIndex",
      partitionKey: { name: "orderNoIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "orderNoIndexSk", type: dynamodb.AttributeType.STRING }, // `${orderNoLower}#${salesOrderId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ステータス（スパース）
    salesOrders.table.addGlobalSecondaryIndex({
      indexName: "SalesOrdersByShippedStatusIndex",
      partitionKey: { name: "shippedStatusIndexPk", type: dynamodb.AttributeType.STRING }, // orgId (trueの時だけ)
      sortKey: { name: "shippedStatusIndexSk", type: dynamodb.AttributeType.STRING }, // orderDate
      projectionType: dynamodb.ProjectionType.ALL,
    });
    salesOrders.table.addGlobalSecondaryIndex({
      indexName: "SalesOrdersByDeliveredStatusIndex",
      partitionKey: { name: "deliveredStatusIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "deliveredStatusIndexSk", type: dynamodb.AttributeType.STRING }, // orderDate
      projectionType: dynamodb.ProjectionType.ALL,
    });
    salesOrders.table.addGlobalSecondaryIndex({
      indexName: "SalesOrdersByPaidStatusIndex",
      partitionKey: { name: "paidStatusIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "paidStatusIndexSk", type: dynamodb.AttributeType.STRING }, // orderDate
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ---- payment_definitions ----
    const paymentDefs = this.createTable({
      tableName: "payment-definitions-master",
      pk: { name: "orgId", type: dynamodb.AttributeType.STRING },
      sk: { name: "paymentDefId", type: dynamodb.AttributeType.STRING },
      removalPolicy,
    });
    this.paymentDefinitionsTable = paymentDefs.table;

    paymentDefs.table.addGlobalSecondaryIndex({
      indexName: "PaymentDefsByCategoryIndex",
      partitionKey: { name: "categoryIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${category}`
      sortKey: { name: "categoryIndexSk", type: dynamodb.AttributeType.STRING }, // `${contentLower}#${paymentDefId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });

    paymentDefs.table.addGlobalSecondaryIndex({
      indexName: "PaymentDefsByFixedCostIndex",
      partitionKey: { name: "fixedCostIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#fixed|variable`
      sortKey: { name: "fixedCostIndexSk", type: dynamodb.AttributeType.STRING }, // `${contentLower}#${paymentDefId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });

    paymentDefs.table.addGlobalSecondaryIndex({
      indexName: "PaymentDefsByCurrencyIndex",
      partitionKey: { name: "currencyIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${currency}`
      sortKey: { name: "currencyIndexSk", type: dynamodb.AttributeType.STRING }, // `${contentLower}#${paymentDefId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });

    paymentDefs.table.addGlobalSecondaryIndex({
      indexName: "PaymentDefsByPaymentMethodIndex",
      partitionKey: { name: "paymentMethodIndexPk", type: dynamodb.AttributeType.STRING }, // `${orgId}#${paymentMethod}`
      sortKey: { name: "paymentMethodIndexSk", type: dynamodb.AttributeType.STRING }, // `${contentLower}#${paymentDefId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });

    paymentDefs.table.addGlobalSecondaryIndex({
      indexName: "PaymentDefsByPaymentDayIndex",
      partitionKey: { name: "paymentDayIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "paymentDayIndexSk", type: dynamodb.AttributeType.NUMBER }, // paymentDay (1..31)
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // fixedAmount は固定費だけが持つ想定（属性が無いアイテムはGSIに載らない＝スパース）
    paymentDefs.table.addGlobalSecondaryIndex({
      indexName: "PaymentDefsByFixedAmountIndex",
      partitionKey: { name: "fixedAmountIndexPk", type: dynamodb.AttributeType.STRING }, // orgId
      sortKey: { name: "fixedAmountIndexSk", type: dynamodb.AttributeType.NUMBER }, // fixedAmount
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ---- payments（支払い管理：月が主語）----
    const payments = this.createTable({
      tableName: "payments",
      pk: { name: "paymentMonthKey", type: dynamodb.AttributeType.STRING }, // `${orgId}#${YYYY-MM}`
      sk: { name: "paymentId", type: dynamodb.AttributeType.STRING },
      removalPolicy,
    });
    this.paymentsTable = payments.table;

    // 月内の支払日で並べたい用
    payments.table.addGlobalSecondaryIndex({
      indexName: "PaymentsByMonthPaymentDateIndex",
      partitionKey: { name: "paymentDateIndexPk", type: dynamodb.AttributeType.STRING }, // paymentMonthKey
      sortKey: { name: "paymentDateIndexSk", type: dynamodb.AttributeType.STRING }, // paymentDate (YYYY-MM-DD)
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 月×カテゴリ / 通貨 / 方法 / ステータス
    payments.table.addGlobalSecondaryIndex({
      indexName: "PaymentsByMonthCategoryIndex",
      partitionKey: { name: "monthCategoryIndexPk", type: dynamodb.AttributeType.STRING }, // `${paymentMonthKey}#${category}`
      sortKey: { name: "monthCategoryIndexSk", type: dynamodb.AttributeType.STRING }, // paymentDate
      projectionType: dynamodb.ProjectionType.ALL,
    });
    payments.table.addGlobalSecondaryIndex({
      indexName: "PaymentsByMonthCurrencyIndex",
      partitionKey: { name: "monthCurrencyIndexPk", type: dynamodb.AttributeType.STRING }, // `${paymentMonthKey}#${currency}`
      sortKey: { name: "monthCurrencyIndexSk", type: dynamodb.AttributeType.STRING }, // paymentDate
      projectionType: dynamodb.ProjectionType.ALL,
    });
    payments.table.addGlobalSecondaryIndex({
      indexName: "PaymentsByMonthPaymentMethodIndex",
      partitionKey: { name: "monthPaymentMethodIndexPk", type: dynamodb.AttributeType.STRING }, // `${paymentMonthKey}#${paymentMethod}`
      sortKey: { name: "monthPaymentMethodIndexSk", type: dynamodb.AttributeType.STRING }, // paymentDate
      projectionType: dynamodb.ProjectionType.ALL,
    });
    payments.table.addGlobalSecondaryIndex({
      indexName: "PaymentsByMonthStatusIndex",
      partitionKey: { name: "monthStatusIndexPk", type: dynamodb.AttributeType.STRING }, // `${paymentMonthKey}#${status}`
      sortKey: { name: "monthStatusIndexSk", type: dynamodb.AttributeType.STRING }, // paymentDate
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 月内の金額レンジ
    payments.table.addGlobalSecondaryIndex({
      indexName: "PaymentsByMonthAmountIndex",
      partitionKey: { name: "monthAmountIndexPk", type: dynamodb.AttributeType.STRING }, // paymentMonthKey
      sortKey: { name: "monthAmountIndexSk", type: dynamodb.AttributeType.NUMBER }, // amount
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 月内の内容（前方一致）
    payments.table.addGlobalSecondaryIndex({
      indexName: "PaymentsByMonthContentIndex",
      partitionKey: { name: "monthContentIndexPk", type: dynamodb.AttributeType.STRING }, // paymentMonthKey
      sortKey: { name: "monthContentIndexSk", type: dynamodb.AttributeType.STRING }, // `${contentLower}#${paymentId}`
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ---- sequences（採番）----
    const sequences = this.createTable({
      tableName: "sequences",
      pk: { name: "orgId", type: dynamodb.AttributeType.STRING },
      sk: { name: "sequenceName", type: dynamodb.AttributeType.STRING }, // e.g. "PO", "SO", "PAY"
      removalPolicy,
    });
    this.sequencesTable = sequences.table;

    // ---- settings（設定）----
    const settings = this.createTable({
      tableName: "settings",
      pk: { name: "orgId", type: dynamodb.AttributeType.STRING },
      sk: { name: "settingsKey", type: dynamodb.AttributeType.STRING }, // e.g. "DEFAULT"
      removalPolicy,
    });
    this.settingsTable = settings.table;
  }

  private createTable(args: {
    tableName: string;
    pk: { name: string; type: dynamodb.AttributeType };
    sk: { name: string; type: dynamodb.AttributeType };
    removalPolicy: RemovalPolicy;
  }): TableWithKeys {
    const stage = this.node.tryGetContext("env") ?? "dev";
    const prefix = this.node.tryGetContext("tablePrefix") ?? "masuda-vinyl-ops";

    const physicalTableName = `${prefix}-${args.tableName}-${stage}`;

    const table = new Table(this, `${args.tableName}Table`, {
      tableName: physicalTableName,
      partitionKey: args.pk,
      sortKey: args.sk,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: args.removalPolicy,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: this.pointInTimeRecoveryEnabled,
      },
    });

    return { table };
  }
}
