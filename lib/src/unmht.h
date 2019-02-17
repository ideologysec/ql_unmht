/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is UnMHT for QuickLook.
 *
 * The Initial Developer of the Original Code is arai.
 * Portions created by the Initial Developer are Copyright (C) 2012
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): arai <arai_a@mac.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * ***** END LICENSE BLOCK ***** */

#ifndef __unmht_h_included__
#define __unmht_h_included__

#include <stdint.h>
#include <string.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * MIME の各パート
 */
typedef struct {
  char *charset;      /* Content-Type フィールドの charset */
  char *mimetype;     /* Content-Type フィールドの MIME-Type */
  char *cid;          /* Content-ID フィールド */

  char *content;      /* ボディ */
  size_t contentSize; /* ボディの長さ */
} mimepart;

/**
 * MHT ファイルの展開情報
 */
typedef struct {
  char *baseURI;       /* 起点となる URI */
  char *subject;       /* Subject フィールド */

  mimepart *startPart; /* 開始パート */

  mimepart **parts;    /* パート */
  uint32_t partsCount; /* パートの数 */
} efileinfo;

/**
 * MHT ファイルを展開する
 *
 * @param   text
 *          MHT ファイルの文字列
 * @param   script
 *          ql_unmht.js の内容
 * @param   cidMode
 *          true ならば参照に cid を使用するか
 *          false ならば参照にダミーの URL を使用する
 * @returns MHT ファイルの展開情報
 */
efileinfo *
extract(const char *text, const char *script, int32_t cidMode);

/**
 * MHT ファイルの展開情報を開放する
 *
 * @param   info
 *          MHT ファイルの展開情報
 */
void
delete_efileinfo(efileinfo *info);

#ifdef __cplusplus
}
#endif

#endif /* __unmht_h_included__ */
