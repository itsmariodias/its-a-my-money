import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as Print from 'expo-print';
import * as LegacyFS from 'expo-file-system/legacy';
import type { Statement } from './statementData';
import { renderStatementHtml, type StatementHtmlOptions } from './statementHtml';

/** A bundled asset as base64, or null — the statement renders fine without its font and logo. */
async function assetBase64(module: number): Promise<string | null> {
  try {
    const asset = await Asset.fromModule(module).downloadAsync();
    if (!asset.localUri) return null;
    return await LegacyFS.readAsStringAsync(asset.localUri, { encoding: LegacyFS.EncodingType.Base64 });
  } catch {
    return null;
  }
}

/** Renders the statement to an A4 PDF in the cache directory. */
export async function exportStatementPdf(
  statement: Statement,
  opts: Omit<StatementHtmlOptions, 'fontBase64' | 'logoBase64'>,
): Promise<{ uri: string; filename: string }> {
  const [fontBase64, logoBase64] = await Promise.all([
    assetBase64(require('../../assets/fonts/LilitaOne-Regular.ttf')),
    assetBase64(require('../../assets/images/icon.png')),
  ]);
  const html = renderStatementHtml(statement, { ...opts, fontBase64, logoBase64 });

  const { uri } = await Print.printToFileAsync({
    html,
    width: 595, // A4 at 72 PPI
    height: 842,
    // iOS ignores the CSS @page margin; Android honours it.
    margins: Platform.OS === 'ios' ? { top: 40, right: 34, bottom: 40, left: 34 } : undefined,
  });

  const filename = `its-a-my-money-statement-${statement.start}_${statement.end}.pdf`;
  const target = `${LegacyFS.cacheDirectory}${filename}`;
  await LegacyFS.deleteAsync(target, { idempotent: true });
  await LegacyFS.moveAsync({ from: uri, to: target });
  return { uri: target, filename };
}
