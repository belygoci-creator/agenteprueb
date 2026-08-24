import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { NextResponse } from "next/server";

import { obtenerClienteCompleto } from "@/lib/clientes/obtener-cliente-completo";
import { construirReporte, nombreArchivoSeguro } from "@/lib/clientes/reporte";

const MARGEN = 50;
const ANCHO_PAGINA = 595.28; // A4
const ALTO_PAGINA = 841.89;
const ANCHO_TEXTO = ANCHO_PAGINA - MARGEN * 2;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const datos = await obtenerClienteCompleto(id);

  if (!datos.cliente) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }

  const reporte = construirReporte(datos);

  const pdf = await PDFDocument.create();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([ANCHO_PAGINA, ALTO_PAGINA]);
  let y = ALTO_PAGINA - MARGEN;

  const nuevaPaginaSiNecesario = (alturaNecesaria: number) => {
    if (y - alturaNecesaria < MARGEN) {
      page = pdf.addPage([ANCHO_PAGINA, ALTO_PAGINA]);
      y = ALTO_PAGINA - MARGEN;
    }
  };

  const escribirLinea = (texto: string, opts: { font: PDFFont; size: number; color?: [number, number, number] }) => {
    const lineas = ajustarTexto(texto, opts.font, opts.size, ANCHO_TEXTO);
    for (const linea of lineas) {
      nuevaPaginaSiNecesario(opts.size + 4);
      page.drawText(linea, {
        x: MARGEN,
        y,
        size: opts.size,
        font: opts.font,
        color: opts.color ? rgb(...opts.color) : rgb(0.1, 0.08, 0.07),
      });
      y -= opts.size + 4;
    }
  };

  escribirLinea(reporte.nombreCliente, { font: fontBold, size: 20 });
  escribirLinea(`Generado el ${reporte.generadoEl}`, { font: fontRegular, size: 9, color: [0.4, 0.4, 0.4] });
  y -= 10;

  for (const seccion of reporte.secciones) {
    nuevaPaginaSiNecesario(30);
    y -= 10;
    escribirLinea(seccion.titulo, { font: fontBold, size: 14 });
    y -= 4;

    for (const item of seccion.items) {
      escribirLinea(`${item.label}: ${item.valor}`, { font: fontRegular, size: 10.5 });
    }
    if (seccion.notas) {
      escribirLinea(`Notas: ${seccion.notas}`, { font: fontRegular, size: 10.5 });
    }
  }

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivoSeguro(reporte.nombreCliente)}.pdf"`,
    },
  });
}

function ajustarTexto(texto: string, font: PDFFont, size: number, anchoMax: number): string[] {
  const palabras = texto.split(" ");
  const lineas: string[] = [];
  let actual = "";

  for (const palabra of palabras) {
    const intento = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(intento, size) > anchoMax && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = intento;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

