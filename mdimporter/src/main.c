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

#include <CoreFoundation/CFPlugInCOM.h>
#include <CoreServices/CoreServices.h>

#define PLUGIN_ID "11A3747A-FE57-43FB-A4C9-DD9E9A5E36F2" /* プラグインの ID */

/**
 * プラグインのクラス
 */
typedef struct __MetadataImporterPluginType {
  MDImporterInterfaceStruct *importerInterface;  /* インポータの
                                                  * インターフェース関数テーブル */
  CFUUIDRef                 factoryID;           /* ファクトリの ID */
  UInt32                    refCount;            /* 参照カウント */
} MetadataImporterPluginType;

/* ==== プロトタイプ宣言: ここから ==== */
Boolean
GetMetadataForFile(void *thisInterface,
                   CFMutableDictionaryRef attributes,
                   CFStringRef contentTypeUTI,
                   CFStringRef pathToFile);

MetadataImporterPluginType *
AllocMetadataImporterPluginType(CFUUIDRef inFactoryID);

void
DeallocMetadataImporterPluginType(MetadataImporterPluginType *thisInstance);

HRESULT
MetadataImporterQueryInterface(void *thisInstance, REFIID iid, LPVOID *ppv);

void
*MetadataImporterPluginFactory(CFAllocatorRef allocator, CFUUIDRef typeID);

ULONG
MetadataImporterPluginAddRef(void *thisInstance);

ULONG
MetadataImporterPluginRelease(void *thisInstance);

/* ==== プロトタイプ宣言: ここまで ==== */

/**
 * ジェネレータのインターフェース関数テーブル
 */
static MDImporterInterfaceStruct arMHTImporterFunctionTable = {
  NULL,
  MetadataImporterQueryInterface,
  MetadataImporterPluginAddRef,
  MetadataImporterPluginRelease,
  GetMetadataForFile
};

/**
 * プラグインのインスタンスを確保する
 *
 * @param   inFactoryID
 *          ファクトリの ID
 */
MetadataImporterPluginType *
AllocMetadataImporterPluginType(CFUUIDRef inFactoryID) {
  MetadataImporterPluginType *theNewInstance
    = (MetadataImporterPluginType *)
    malloc(sizeof(MetadataImporterPluginType));
  memset(theNewInstance, 0, sizeof(MetadataImporterPluginType));

  theNewInstance->importerInterface = &arMHTImporterFunctionTable;

  theNewInstance->factoryID = CFRetain(inFactoryID);
  CFPlugInAddInstanceForFactory(inFactoryID);

  theNewInstance->refCount = 1;

  return theNewInstance;
}

/**
 * プラグインのインスタンスを破棄する
 *
 * @param   thisInstance
 *          プラグインのインスタンス
 */
void
DeallocMetadataImporterPluginType(MetadataImporterPluginType *thisInstance) {
  CFUUIDRef theFactoryID = thisInstance->factoryID;
  free(thisInstance);

  if (theFactoryID) {
    CFPlugInRemoveInstanceForFactory(theFactoryID);
    CFRelease(theFactoryID);
  }
}

/**
 * プラグインの提供するインターフェースを要求する
 *
 * @param   thisInstance
 *          プラグインのインスタンス
 * @param   iid
 *          要求するインターフェースの ID
 * @param   ppv
 *          返り値
 *            インターフェースの ID が一致すればプラグインのインスタンス
 *            一致しなければ NULL
 * @returns 結果
 *            インターフェースの ID が一致すれば S_OK
 *            一致しなければ E_NOINTERFACE
 */
HRESULT
MetadataImporterQueryInterface(void *thisInstance, REFIID iid, LPVOID *ppv) {
  CFUUIDRef interfaceID
    = CFUUIDCreateFromUUIDBytes(kCFAllocatorDefault,iid);

  if (CFEqual(interfaceID, kMDImporterInterfaceID)) {
    ((MetadataImporterPluginType*)thisInstance)->importerInterface->AddRef(thisInstance);
    *ppv = thisInstance;
    CFRelease(interfaceID);
    return S_OK;
  } else if (CFEqual(interfaceID, IUnknownUUID)) {
    ((MetadataImporterPluginType*)thisInstance )->importerInterface->AddRef(thisInstance);
    *ppv = thisInstance;
    CFRelease(interfaceID);
    return S_OK;
  } else {
    *ppv = NULL;
    CFRelease(interfaceID);
    return E_NOINTERFACE;
  }
}

/**
 * プラグインの参照カウントを上げる
 *
 * @param   thisInstance
 *          プラグインのインスタンス
 * @returns 参照カウント
 */
ULONG
MetadataImporterPluginAddRef(void *thisInstance) {
  ((MetadataImporterPluginType *)thisInstance )->refCount += 1;
  return ((MetadataImporterPluginType *)thisInstance)->refCount;
}

/**
 * プラグインの参照カウントを下げる
 * 0 になったら破棄する
 *
 * @param   thisInstance
 *          プラグインのインスタンス
 * @returns 参照カウント
 */
ULONG
MetadataImporterPluginRelease(void *thisInstance) {
  ((MetadataImporterPluginType*)thisInstance)->refCount -= 1;
  if (((MetadataImporterPluginType*)thisInstance)->refCount == 0){
    DeallocMetadataImporterPluginType((MetadataImporterPluginType*)thisInstance);
    return 0;
  } else {
    return ((MetadataImporterPluginType *)thisInstance)->refCount;
  }
}

/**
 * プラグインのファクトリ
 *
 * @param   allocator
 *          メモリアロケータ
 * @param   typeID
 *          作成するプラグインの ID
 * @returns ID が一致すれば作成されたプラグインのインスタンス
 *          一致しなければ NULL
 */
void *
MetadataImporterPluginFactory(CFAllocatorRef allocator, CFUUIDRef typeID) {
  if (CFEqual(typeID, kMDImporterTypeID)) {
    CFUUIDRef uuid
      = CFUUIDCreateFromString(kCFAllocatorDefault, CFSTR(PLUGIN_ID));
    MetadataImporterPluginType *result
      = AllocMetadataImporterPluginType(uuid);
    CFRelease(uuid);
    return result;
  }

  return NULL;
}
