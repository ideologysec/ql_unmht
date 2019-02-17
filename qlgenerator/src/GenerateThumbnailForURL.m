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
#import <WebKit/WebKit.h>
#include <stdlib.h>
#include <stdint.h>
#include <sys/time.h>

#include <unmht.h>

#import "UnMHTWebDelegate.h"

/**
 * サムネイルを作成する
 *
 * @param   thisInterface
 *          プラグインのインスタンス
 * @param   thumbnail
 *          サムネイル
 * @param   url
 *          プレビューする URL
 * @param   contentTypeUTI
 *          コンテントタイプ
 * @param   options
 *          オプション
 * @param   maxSize
 *          最大サイズ
 * @returns ステータス
 *            正常に終了した場合 noErr
 */
OSStatus
GenerateThumbnailForURL(void *thisInterface, QLThumbnailRequestRef thumbnail,
                        CFURLRef url, CFStringRef contentTypeUTI,
                        CFDictionaryRef options, CGSize maxSize) {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];

  if (QLThumbnailRequestIsCancelled(thumbnail)) {
    [pool release];
    return noErr;
  }

  NSRect viewRect;
  viewRect.origin.x = 0;
  viewRect.origin.y = 0;
  if (maxSize.width < maxSize.height) {
    viewRect.size.width = 800 * maxSize.width / maxSize.height;
    viewRect.size.height = 800;
  } else {
    viewRect.size.height = 800 * maxSize.height / maxSize.width;
    viewRect.size.width = 800;
  }

  CGSize imageSize;
  imageSize.width = maxSize.width;
  imageSize.height = maxSize.height;

  NSSize scaleSize;
  scaleSize.width = imageSize.width / viewRect.size.width;
  scaleSize.height = imageSize.height / viewRect.size.height;

  CFBundleRef bundle = QLThumbnailRequestGetGeneratorBundle(thumbnail);
  CFURLRef scriptURL = CFBundleCopyResourceURL(bundle,
                                               CFSTR("ql_unmht"), CFSTR("js"),
                                               NULL);

  /* mht の展開 */
  NSString *fileData = [[[NSString alloc]
                          initWithContentsOfURL: (NSURL *)url
                                       encoding: NSUTF8StringEncoding
                                          error: (NSError **)NULL]
                         autorelease];

  NSString *scriptData= [[[NSString alloc]
                           initWithContentsOfURL: (NSURL *)scriptURL
                                        encoding: NSUTF8StringEncoding
                                           error: (NSError **)NULL]
                          autorelease];

  efileinfo *eFileInfo = extract([fileData
                                   cStringUsingEncoding: NSUTF8StringEncoding],
                                 [scriptData
                                   cStringUsingEncoding: NSUTF8StringEncoding],
                                 FALSE);
  if (!eFileInfo) {
    /* 対応していない mht ファイル
     * もしくは異常な mht ファイル */
    [pool release];
    return noErr;
  }

  /* Web ビューを作成 */
  WebView *webView = [[WebView alloc] initWithFrame: viewRect];
  UnMHTWebDelegate *delegate = [[[UnMHTWebDelegate alloc]
                                  initWithEFileInfo: eFileInfo]
                                 autorelease];
  [webView setResourceLoadDelegate: delegate];
  [webView setPolicyDelegate: delegate];
  [webView scaleUnitSquareToSize: scaleSize];

  WebPreferences *webPreferences = [webView preferences];
  NSString *charset = [[[NSString alloc]
                         initWithCString: eFileInfo->startPart->charset
                                encoding: NSUTF8StringEncoding]
                        autorelease];
  [webPreferences setDefaultTextEncodingName: charset];
  [webPreferences setShouldPrintBackgrounds: YES];
  [webPreferences setJavaEnabled: NO];
  [webPreferences setJavaScriptEnabled: YES];
  [webPreferences setJavaScriptCanOpenWindowsAutomatically: NO];
  [webPreferences setPlugInsEnabled: NO];
  [webPreferences setAllowsAnimatedImages: NO];
  [webPreferences setAllowsAnimatedImageLooping: NO];

  /* startPart を読み込む */
  WebFrame *mainFrame = [webView mainFrame];
  NSData *content = [[[NSData alloc]
                       initWithBytes: eFileInfo->startPart->content
                              length: eFileInfo->startPart->contentSize]
                        autorelease];
  NSString *baseURLSpec = [[[NSString alloc]
                             initWithCString: eFileInfo->baseURI
                                    encoding: NSUTF8StringEncoding]
                            autorelease];
  NSURL *baseURL = [[[NSURL alloc]
                      initWithString: baseURLSpec]
                     autorelease];
  [mainFrame loadData: content
             MIMEType: @"text/html"
     textEncodingName: charset
              baseURL: baseURL];

  WebFrameView *mainFrameView = [mainFrame frameView];
  [mainFrameView setAllowsScrolling: NO];

  /* ロードの処理が終えるまでループ */
  struct timeval start_time;
  struct timeval end_time;
  gettimeofday(&start_time, NULL);
  double s = start_time.tv_sec + ((double)start_time.tv_usec) / 1000000.0;
  double e;
  for (;;) {
    for (int i = 0; i < 10000; i ++) {
      CFRunLoopRunInMode(kCFRunLoopDefaultMode, 0, false);
    }
    if (![webView isLoading] && [delegate isFinished]) {
      break;
    }
    gettimeofday(&end_time, NULL);
    e = end_time.tv_sec + ((double)end_time.tv_usec) / 1000000.0;
    if (e - s > 10) {
      gettimeofday(&start_time, NULL);
      s = start_time.tv_sec + ((double)start_time.tv_usec) / 1000000.0;

      [webView stopLoading: nil];
      for (;;) {
        for (int i = 0; i < 10000; i ++) {
          CFRunLoopRunInMode(kCFRunLoopDefaultMode, 0, false);
        }

        if (![webView isLoading] && [delegate isFinished]) {
          break;
        }

        gettimeofday(&end_time, NULL);
        e = end_time.tv_sec + ((double)end_time.tv_usec) / 1000000.0;
        if (e - s > 3) {
          break;
        }
      }

      break;
    }
  }

  [webView setResourceLoadDelegate: nil];
  [webView setPolicyDelegate: nil];
  [webView stopLoading: nil];

  /* 画像を取得 */
  CGContextRef context = QLThumbnailRequestCreateContext(thumbnail,
                                                         imageSize,
                                                         false, NULL);
  if (context != NULL) {
    NSGraphicsContext* nsGraphicsContext
      = [NSGraphicsContext
          graphicsContextWithGraphicsPort: (void *)context
                                  flipped: [webView isFlipped]];

    [webView displayRectIgnoringOpacity: [webView bounds]
                              inContext: nsGraphicsContext];

    /* サムネを設定 */
    QLThumbnailRequestFlushContext(thumbnail, context);

    CFRelease(context);
  }

  [webView release];

  [pool release];

  delete_efileinfo(eFileInfo);

  return noErr;
}

/**
 * サムネイルの作成をキャンセルする
 *
 * @param   thisInterface
 *          プラグインのインスタンス
 * @param   thumbnail
 *          サムネイル
 */
void
CancelThumbnailGeneration(void *thisInterface,
                          QLThumbnailRequestRef thumbnail) {
}
