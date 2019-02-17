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

#import <QuickLook/QuickLook.h>
#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#import <unmht.h>

/**
 * プレビューを作成する
 *
 * @param   thisInterface
 *          プラグインのインスタンス
 * @param   preview
 *          プレビュー
 * @param   url
 *          プレビューする URL
 * @param   contentTypeUTI
 *          コンテントタイプ
 * @param   options
 *          オプション
 * @returns ステータス
 *            正常に終了した場合 noErr
 */
OSStatus
GeneratePreviewForURL(void *thisInterface, QLPreviewRequestRef preview,
                      CFURLRef url, CFStringRef contentTypeUTI,
                      CFDictionaryRef options) {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];

  if (QLPreviewRequestIsCancelled(preview)) {
    [pool release];
    return noErr;
  }

  CFBundleRef bundle = QLPreviewRequestGetGeneratorBundle(preview);
  CFURLRef scriptURL = CFBundleCopyResourceURL(bundle,
                                               CFSTR("ql_unmht"), CFSTR("js"),
                                               NULL);

  NSString *fileData = [[[NSString alloc]
                          initWithContentsOfURL: (NSURL *)url
                                       encoding: NSUTF8StringEncoding
                                          error: (NSError **)NULL]
                         autorelease];

  NSString *scriptData = [[[NSString alloc]
                            initWithContentsOfURL: (NSURL *)scriptURL
                                         encoding: NSUTF8StringEncoding
                                            error: (NSError **)NULL]
                           autorelease];

  efileinfo *eFileInfo = extract([fileData
                                   cStringUsingEncoding: NSUTF8StringEncoding],
                                 [scriptData
                                   cStringUsingEncoding: NSUTF8StringEncoding],
                                 TRUE);
  if (!eFileInfo) {
    [pool release];
    return noErr;
  }

  /* startPart の設定 */
  NSMutableDictionary *properties = [[[NSMutableDictionary alloc] init]
                                      autorelease];
  NSString *charset = [[[NSString alloc]
                         initWithCString: eFileInfo->startPart->charset
                                encoding: NSASCIIStringEncoding]
                        autorelease];
  [properties
    setObject: charset
       forKey: (NSString *)kQLPreviewPropertyTextEncodingNameKey];
  [properties
    setObject: @"text/html"
       forKey: (NSString *)kQLPreviewPropertyMIMETypeKey];

  /* 幅は 800, 高さはスクリーンと同じ */
  SInt32 n;
  n = 800;
  CFNumberRef width = CFNumberCreate(kCFAllocatorDefault,
                                     kCFNumberSInt32Type, &n);
  n = [[NSScreen mainScreen] frame].size.height;
  CFNumberRef height = CFNumberCreate(kCFAllocatorDefault,
                                      kCFNumberSInt32Type, &n);
  [properties
    setObject: (NSNumber *)width
       forKey: (NSString *)kQLPreviewPropertyWidthKey];
  [properties
    setObject: (NSNumber *)height
       forKey: (NSString *)kQLPreviewPropertyHeightKey];

  /* 添付ファイルの設定 */
  NSMutableDictionary *attachment = [[[NSMutableDictionary alloc] init]
                                      autorelease];
  for (int i = 0; i < eFileInfo->partsCount; i ++) {
    mimepart *part = eFileInfo->parts[i];

    NSMutableDictionary *attachmentProperties = [[[NSMutableDictionary alloc]
                                                   init]
                                                  autorelease];
    NSString *mimetype = [[[NSString alloc]
                            initWithCString: part->mimetype
                                   encoding: NSASCIIStringEncoding]
                           autorelease];
    [attachmentProperties
      setObject: mimetype
         forKey: (NSString *)kQLPreviewPropertyMIMETypeKey];
    NSData *content = [[[NSData alloc]
                         initWithBytes: part->content
                                length: part->contentSize]
                        autorelease];
    [attachmentProperties
        setObject: content
           forKey: (NSString *)kQLPreviewPropertyAttachmentDataKey];

    NSString *cid = [[[NSString alloc]
                       initWithCString: part->cid
                              encoding: NSASCIIStringEncoding]
                      autorelease];
    [attachment
      setObject: attachmentProperties
         forKey: cid];
  }
  [properties
    setObject: attachment
       forKey: (NSString *)kQLPreviewPropertyAttachmentsKey];

  /* HTML データの設定 */
  NSData *contentData = [[[NSData alloc]
                           initWithBytes: eFileInfo->startPart->content
                                  length: eFileInfo->startPart->contentSize]
                          autorelease];
  QLPreviewRequestSetDataRepresentation(preview,
                                        (CFDataRef)contentData,
                                        kUTTypeHTML,
                                        (CFDictionaryRef)properties);

  [pool release];

  delete_efileinfo(eFileInfo);

  return noErr;
}

/**
 * プレビューの作成をキャンセルする
 *
 * @param   thisInterface
 *          プラグインのインスタンス
 * @param   preview
 *          プレビュー
 */
void
CancelPreviewGeneration(void* thisInterface, QLPreviewRequestRef preview) {
}
