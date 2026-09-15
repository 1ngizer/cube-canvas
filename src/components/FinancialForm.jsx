import React from "react";
import { formatCurrency } from "../utils/finance";

export default function FinancialForm({ formData, onChange, onResetMock }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Permite solo números
    const numericValue = value === "" ? "" : Number(value.replace(/[^0-9.-]+/g, ""));
    onChange({
      ...formData,
      [name]: numericValue,
    });
  };

  const handleSalesModeChange = (mode) => {
    onChange({
      ...formData,
      salesMode: mode,
    });
  };

  // Manejo de productos dinámicos
  const handleAddProduct = () => {
    const currentProducts = formData.products || [];
    const newProduct = {
      id: Date.now(),
      name: `Producto/Servicio ${currentProducts.length + 1}`,
      unitPrice: 50000,
      units: 100,
    };
    onChange({
      ...formData,
      products: [...currentProducts, newProduct],
    });
  };

  const handleProductChange = (id, field, value) => {
    const currentProducts = formData.products || [];
    const updated = currentProducts.map((p) => {
      if (p.id !== id) return p;
      const parsedVal =
        field === "name"
          ? value
          : value === ""
          ? ""
          : Number(value.replace(/[^0-9.-]+/g, ""));
      return { ...p, [field]: parsedVal };
    });
    onChange({
      ...formData,
      products: updated,
    });
  };

  const handleRemoveProduct = (id) => {
    const currentProducts = formData.products || [];
    onChange({
      ...formData,
      products: currentProducts.filter((p) => p.id !== id),
    });
  };

  const totalFromProducts = (formData.products || []).reduce(
    (acc, p) => acc + (Number(p.unitPrice) || 0) * (Number(p.units) || 0),
    0
  );

  return (
    <form className="card" onSubmit={(e) => e.preventDefault()}>
      {/* SECCIÓN 1: CAJA Y COMPROMISOS */}
      <div className="form-section">
        <h3 className="section-title">
          <span>🏦</span> 1. Posición de Caja y Pasivos
        </h3>
        <div className="input-row input-row-2">
          <div className="input-group">
            <label htmlFor="initialCash">Efectivo Disponible Inicial</label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                id="initialCash"
                name="initialCash"
                type="number"
                className="input-control"
                placeholder="Ej. 15000000"
                value={formData.initialCash}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="debtPayment">Amortización / Pago de Deudas</label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                id="debtPayment"
                name="debtPayment"
                type="number"
                className="input-control"
                placeholder="Ej. 3000000"
                value={formData.debtPayment}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: PLAN DE VENTAS (MODALIDAD SIMPLE O POR PRODUCTOS) */}
      <div className="form-section">
        <div className="section-header-flex">
          <h3 className="section-title" style={{ marginBottom: 0 }}>
            <span>📈</span> 2. Plan de Ingresos Proyectados
          </h3>
          <div className="mode-toggle">
            <button
              type="button"
              className={`toggle-btn ${formData.salesMode !== "products" ? "active" : ""}`}
              onClick={() => handleSalesModeChange("simple")}
            >
              Venta Global
            </button>
            <button
              type="button"
              className={`toggle-btn ${formData.salesMode === "products" ? "active" : ""}`}
              onClick={() => handleSalesModeChange("products")}
            >
              Por Productos
            </button>
          </div>
        </div>

        {formData.salesMode !== "products" ? (
          <div className="input-row" style={{ marginTop: "1rem" }}>
            <div className="input-group">
              <label htmlFor="projectedSales">Ventas Proyectadas del Período</label>
              <div className="input-wrapper">
                <span className="input-prefix">$</span>
                <input
                  id="projectedSales"
                  name="projectedSales"
                  type="number"
                  className="input-control"
                  placeholder="Ej. 35000000"
                  value={formData.projectedSales}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="products-container" style={{ marginTop: "1rem" }}>
            {(formData.products || []).length === 0 ? (
              <p className="empty-notice">
                No hay productos configurados. Haz clic en "Agregar Producto" para comenzar.
              </p>
            ) : (
              <div className="products-table-wrapper">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Producto / Servicio</th>
                      <th>Precio Unitario</th>
                      <th>Unidades</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.products || []).map((p) => {
                      const subtotal = (Number(p.unitPrice) || 0) * (Number(p.units) || 0);
                      return (
                        <tr key={p.id}>
                          <td>
                            <input
                              type="text"
                              className="input-control table-input"
                              value={p.name}
                              placeholder="Nombre"
                              onChange={(e) => handleProductChange(p.id, "name", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="input-control table-input"
                              value={p.unitPrice}
                              placeholder="0"
                              onChange={(e) =>
                                handleProductChange(p.id, "unitPrice", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="input-control table-input"
                              value={p.units}
                              placeholder="0"
                              onChange={(e) => handleProductChange(p.id, "units", e.target.value)}
                            />
                          </td>
                          <td className="table-subtotal">{formatCurrency(subtotal)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-icon-delete"
                              title="Eliminar producto"
                              onClick={() => handleRemoveProduct(p.id)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="products-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddProduct}
              >
                + Agregar Producto
              </button>
              <div className="products-total-badge">
                <span>Total Ventas:</span>
                <strong>{formatCurrency(totalFromProducts)}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 3: ESTRUCTURA DE COSTOS */}
      <div className="form-section">
        <h3 className="section-title">
          <span>📊</span> 3. Estructura de Costos Operativos
        </h3>
        <div className="input-row input-row-2">
          <div className="input-group">
            <label htmlFor="fixedCosts">Costos Fijos (Nómina, arriendo, servicios)</label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                id="fixedCosts"
                name="fixedCosts"
                type="number"
                className="input-control"
                placeholder="Ej. 12000000"
                value={formData.fixedCosts}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="variableCosts">Costos Variables (Materia prima, comisiones)</label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                id="variableCosts"
                name="variableCosts"
                type="number"
                className="input-control"
                placeholder="Ej. 8000000"
                value={formData.variableCosts}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="btn-group">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onResetMock}
        >
          ↺ Cargar Datos Demo
        </button>
      </div>
    </form>
  );
}
