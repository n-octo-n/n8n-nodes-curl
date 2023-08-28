#!/bin/sh
# Needed on current system: grep, cut, rev, curl, zip, tar, gzip, xz. 
set -ex
cd "$( dirname "$( realpath "$0" )" )/bin/curl"
BaseUrl="https://github.com/stunnel/static-curl/releases"
Version="$(curl -i "${BaseUrl}/latest" | grep -i "location: " | rev | cut -b2- | cut -d/ -f1 | rev)"
GetItem(){
	ArchSrc="$2"
	ArchDst="$1"
	FileSrc="./tmp/${ArchSrc}.tar.xz"
	curl -L -o "${FileSrc}" "${BaseUrl}/download/${Version}/curl-static-${ArchSrc}-${Version}.tar.xz"
	tar xJSf "${FileSrc}"
	mv ./curl "./tmp/${ArchDst}"
	#zip -9 "./${ArchDst}.zip" "./tmp/${ArchDst}"
	gzip --best --stdout "./tmp/${ArchDst}" > "./${ArchDst}.gz"
}
mkdir -p ./tmp
GetItem arm armv7
GetItem arm64 arm64
GetItem ia32 i686
#GetItem mips   mips
#GetItem mipsel mipsel
#GetItem mips   mips64
#GetItem mipsel mips64el
GetItem ppc powerpc
#GetItem ppc64 powerpc64le
#GetItem s390
GetItem s390x s390x
GetItem x64 amd64
rm -rf ./tmp
