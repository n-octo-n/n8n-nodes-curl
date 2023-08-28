# n8n-nodes-curl

This n8n node lets you call out to the cURL binary to do any kind of supported HTTP operation, via the standard `curl` command-line syntax.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

The statically-compiled cURL binaries used by this node are provided by [stunnel/static-curl](https://github.com/stunnel/static-curl). Refer to that repository for a list of the features provided by the binaries.

[Installation](#installation)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Quirks](#quirks)
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Compatibility

Tested on n8n `1.4.0`.

## Usage

This node simply provides an input field to pass shell command-line arguments to cURL, and outputs the following object in case of success:
```
{ key           | example
----------------|----------------------------------------------------
  data          | <p>This is not the string you were expecting.</p>
  statusCode    | 200
  statusMessage | OK
  headers       | { "content-type": "text/html; charset=utf-8" }
}
```

Be careful of what data you pass to the input field of this node, as everything is simply handed to the system shell to be passed to cURL. Be especially mindful of using shell quotes and escapes when needed; use JavaScript functions if you need to filter data.

On first use, the node automatically downloads the correct cURL binary for your system architecture (~3 MB, but varies), then stores it for future use. Just wait if it seems like the node takes a while to elaborate.

## Quirks

* Currently, this node only supports dealing with text data. If any HTTP endpoint you call with this node returns binary data, there's no guarantee that the result will be fine.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [cURL documentation](https://curl.se/docs/)
	* [curl | tldr pages](https://tldr.inbrowser.app/pages/common/curl)

