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

#import <CoreFoundation/CoreFoundation.h>
#import <CoreServices/CoreServices.h>
#import <Foundation/Foundation.h>
#import <unmht.h>

/**
 * 文字列を NSString に変換する
 *
 * @param   text
 *          対象の文字列
 * @param   length
 *          文字列の長さ
 * @param   charset
 *          文字列のエンコーディング
 * @returns 変換した NSString
 *            失敗したら nil
 */
NSString *
convertToNSString(const char *text, uint32_t length,
                  const char *charset) {
  NSString *charsetString= [[NSString alloc]
                             initWithCString: charset
                                    encoding: NSASCIIStringEncoding];
  if (charsetString == nil) {
    return nil;
  }

  NSStringEncoding encoding = CFStringConvertEncodingToNSStringEncoding(CFStringConvertIANACharSetNameToEncoding((CFStringRef)charsetString));
  [charsetString release];

  return [[NSString alloc] initWithBytes: text
                                  length: length
                                encoding: encoding];
}

/**
 * ファイルのメタデータを取得する
 *
 * @param   thisInterface
 *          プラグインのインスタンス
 * @param   attributes
 *          ファイルのメタデータ
 * @param   contentTypeUTI
 *          ファイルの UTI
 * @param   pathToFile
 *          ファイルのパス
 * @returns 変更したかどうか
 */
Boolean
GetMetadataForFile(void* thisInterface,
                   CFMutableDictionaryRef attributes,
                   CFStringRef contentTypeUTI,
                   CFStringRef pathToFile) {
  NSBundle *bundle = [NSBundle bundleWithIdentifier: @"org.unmht.ql_unmht.mdimporter"];
  NSURL *scriptURL = [bundle URLForResource: @"ql_unmht"
                              withExtension: @"js"];

  NSString *fileData = [[NSString alloc]
                         initWithContentsOfFile: (NSString *)pathToFile
                                       encoding: NSUTF8StringEncoding
                                          error: (NSError **)NULL];

  NSString *scriptData = [[NSString alloc]
                           initWithContentsOfURL: scriptURL
                                        encoding: NSUTF8StringEncoding
                                           error: (NSError **)NULL];

  efileinfo *eFileInfo = extract([fileData
                                   cStringUsingEncoding: NSUTF8StringEncoding],
                                 [scriptData
                                   cStringUsingEncoding: NSUTF8StringEncoding],
                                 TRUE);
  [fileData release];
  [scriptData release];
  if (!eFileInfo) {
    return FALSE;
  }

  NSMutableString *content = [NSMutableString string];

  for (int i = 0; i < eFileInfo->partsCount; i ++) {
    mimepart *part = eFileInfo->parts[i];

    NSString *partContent = convertToNSString(part->content,
                                              part->contentSize,
                                              part->charset);
    if (partContent != nil) {
      [content appendString: partContent];
      [partContent release];
    }
  }

  NSMutableDictionary *attr = (NSMutableDictionary *)attributes;
  if (eFileInfo->subject) {
    NSMutableString *subject = [NSMutableString string];
    NSString *subjectString = [[NSString alloc]
                                initWithCString: eFileInfo->subject
                                       encoding: NSUTF8StringEncoding];
    [subject appendString: subjectString];
    [subjectString release];
    [attr setObject: subject
             forKey: (id)kMDItemTitle];
  }
  [attr setObject: content
           forKey: (id)kMDItemTextContent];

  delete_efileinfo(eFileInfo);

  return TRUE;
}
