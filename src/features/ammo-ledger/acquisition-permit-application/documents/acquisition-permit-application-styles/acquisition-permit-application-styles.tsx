export function AcquisitionPermitApplicationStyles() {
  return (
    <style>{`
      .application-form-print {
        color: #000;
      }

      .application-form-page {
        position: relative;
        box-sizing: border-box;
        margin: 0 auto 16px;
        overflow: hidden;
        background-color: #fff;
        background-repeat: no-repeat;
        background-position: center;
        background-size: 100% 100%;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
      }

      .application-form-page__overlay {
        position: absolute;
        inset: 0;
      }

      .application-overlay-field {
        position: absolute;
        box-sizing: border-box;
        line-height: 1.2;
        white-space: pre-wrap;
        overflow: hidden;
        color: #000;
        font-family: "Hiragino Mincho ProN", "Yu Mincho", "MS PMincho", serif;
      }

      .application-overlay-field--checkbox {
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        overflow: visible;
      }

      @media print {
        @page {
          size: A4 portrait;
          margin: 0;
        }

        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
        }

        body * {
          visibility: hidden;
        }

        .application-form-print,
        .application-form-print * {
          visibility: visible;
        }

        .application-form-print {
          position: absolute;
          left: 0;
          top: 0;
          width: 210mm;
          margin: 0;
          padding: 0;
        }

        .application-form-print > .no-print {
          display: none !important;
        }

        .no-print {
          display: none !important;
        }

        :is(main, div)[class*="max-w-3xl"] {
          max-width: none !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }

        html.printing-application-main .application-form-supplement,
        html.printing-application-main .application-form-resume,
        html.printing-application-main .application-form-cohabitants {
          display: none !important;
        }

        html.printing-application-supplement .application-form-main,
        html.printing-application-supplement .application-form-resume,
        html.printing-application-supplement .application-form-cohabitants {
          display: none !important;
        }

        html.printing-application-resume .application-form-main,
        html.printing-application-resume .application-form-supplement,
        html.printing-application-resume .application-form-cohabitants {
          display: none !important;
        }

        html.printing-application-cohabitants .application-form-main,
        html.printing-application-cohabitants .application-form-supplement,
        html.printing-application-cohabitants .application-form-resume {
          display: none !important;
        }

        .application-form-page {
          width: 210mm !important;
          height: 297mm !important;
          margin: 0 !important;
          box-shadow: none !important;
          break-after: page;
          page-break-after: always;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .application-form-main .application-form-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        .application-form-supplement .application-form-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }
      }
    `}</style>
  );
}
