export function AcquisitionPermitApplicationStyles() {
  return (
    <style>{`
      .application-form-print {
        color: #000;
      }

      .application-form-page {
        position: relative;
        margin: 0 auto 16px;
        overflow: hidden;
        background: #fff;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
      }

      .application-form-page__background {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: fill;
        pointer-events: none;
        user-select: none;
      }

      .application-form-page__overlay {
        position: absolute;
        inset: 0;
      }

      .application-overlay-field {
        position: absolute;
        line-height: 1.2;
        white-space: pre-wrap;
        overflow: hidden;
        color: #000;
        font-family: "Hiragino Mincho ProN", "Yu Mincho", "MS PMincho", serif;
      }

      @media print {
        @page {
          size: A4 portrait;
          margin: 0;
        }

        body {
          margin: 0;
        }

        .no-print {
          display: none !important;
        }

        .application-form-page {
          margin: 0;
          box-shadow: none;
          break-after: page;
          page-break-after: always;
        }

        .application-form-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }
      }
    `}</style>
  );
}
