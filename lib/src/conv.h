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

#ifndef __conv_h_included__
#define __conv_h_included__

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * 指定したエンコーディングの文字列を UTF16 に変換する
 *
 * @param   text
 *          対象の文字列
 * @param   length
 *          対象の文字列の長さ
 * @param   charset
 *          対象の文字列のエンコーディング
 * @param   result
 *          (出力) 変換した文字列
 * @param   resultLength
 *          (出力) 変換した文字列の長さ
 * @returns 成功したか
 */
int32_t
convertToUnicode(const char *text, uint32_t length,
                 const char *charset,
                 unsigned short**result, uint32_t *resultLength);

/**
 * UTF16 の文字列を指定したエンコーディングに変換する
 *
 * @param   text
 *          UTF16 の文字列
 * @param   length
 *          UTF16 の文字列の長さ
 * @param   charset
 *          変換する文字列のエンコーディング
 * @param   result
 *          (出力) 変換した文字列
 * @param   resultLength
 *          (出力) 変換した文字列の長さ
 * @returns 成功したか
 */
int32_t
convertFromUnicode(const unsigned short *text, uint32_t length,
                   const char *charset,
                   char**result, uint32_t *resultLength);

#ifdef __cplusplus
}
#endif

#endif /* __conv_h_included__ */
