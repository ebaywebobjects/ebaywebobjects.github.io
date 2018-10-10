/**
 * modal plugin code Starts
 *
 */
(function($, window){
    "use strict";
    $.fn.extend({
        modal: function(option) {

            var $document = $(document),
                $window = $(window),
                $body = $('body'),
                isTouch = 'ontouchstart' in document.documentElement,
                timer, // Holds the setTimeout timer
                bAdjustScrollTop = true, // Flag to denote if scroll top should be adjusted
                adjustScrollTop = function(element) {
                    var el = element,
                        isTop = el.scrollTop < 1,
                        isBottom = el.scrollHeight === (el.scrollTop + el.clientHeight);
                    if(isTop){
                        el.scrollTop = 1;
                        bAdjustScrollTop = false;
                    }
                    if(isBottom){
                        el.scrollTop = el.scrollTop - 1;
                        bAdjustScrollTop = false;
                    }
                },

                isOpen = false,

                bind = function($elem, $wrapper, $backdrop) {
                    $document.off('focusin.aria.modal');
                    $document.on('focusin.aria.modal', function (e) {
                        var target = e.target || e.srcElement;

                        if (isOpen && (target !== $elem[0]) && !$elem.find(target).length) {
                            e.stopPropagation();
                            $elem[0].focus();
                        }
                    });
                    if(isTouch) {
                        $wrapper.on('touchstart.modal', function(){
                            adjustScrollTop($wrapper.get(0));
                        });
                        $wrapper.on('touchend.modal touchcancel.modal', function(){
                            bAdjustScrollTop = true;
                        });
                        $wrapper.on('scroll.modal', function() {
                            if(!bAdjustScrollTop) {
                                return;
                            }
                            clearTimeout(timer);
                            timer = setTimeout(function(){
                                adjustScrollTop($wrapper.get(0));
                            }, 16.66);
                        });
                    }
                },

                unbind = function($elem, $wrapper, $backdrop) {
                    $elem.off('click.close.modal');
                    $backdrop.off('click.close.modal.backdrop');
                    $document.off('keyup.close.modal');
                    $document.off('focusin.aria.modal');
                    if(isTouch) {
                        $wrapper.off('scroll.modal touchstart.modal touchend.modal touchcancel.modal');
                    }
                },

                hide = function($elem) {
                    var $backdrop = $('#vilens-modal-backdrop' + $elem.data('index')),
                        $wrapper = $('#vilens-modal-wrapper' + $elem.data('index'));
                    // Check if modal is already hidden
                    if($elem.filter(':hidden').length) {
                        return;
                    }
                    unbind($elem, $wrapper, $backdrop);
                    $wrapper.hide();
                    $elem.hide().attr('aria-hidden', true);
                    $elem.trigger('hide');
                    isOpen = false;
                    // release the body scroll only if no other modal is visible
                    if(!$('.vilens-modal').filter(':visible').length) {
                        $body.removeClass('prevent-scroll');
                    }
                },

                show = function($elem) {

                    var $backdrop = $('#vilens-modal-backdrop' + $elem.data('index')),
                        $wrapper = $('#vilens-modal-wrapper' + $elem.data('index'));
                    // Check if modal is already visible
                    if($elem.filter(':visible').length) {
                        return;
                    }
                    // lock the body
                    $body.addClass('prevent-scroll');
                    // bind events
                    bind($elem, $wrapper, $backdrop);
                    // Show & enable ARIA
                    $wrapper.show();
                    $elem.show().attr('aria-hidden', false);
                    $elem[0].focus();
                    // position the close button
                    // positionClose($elem);
                    // trigger event
                    $elem.trigger('show');
                    isOpen = true;
                },

                resize = function($elem) {
                    // Set the element width first
                    $elem.css('width', 'auto');
                    // Calculate left position
                    var left = Math.max($window.width() - $elem.outerWidth(), 0) / 2;
                    $elem.css({
                        "margin-left": "auto",
                        "left": left + $window.scrollLeft()
                    });
                    // position the close button
                    // positionClose($elem);
                };

            return this.each(function() {
                var $this = $(this),
                    opt = option || 'default';
                switch(opt) {
                    case 'hide':
                        hide($this);
                        break;
                    case 'resize':
                        resize($this);
                        break;
                    default:
                        show($this);
                }
            });
        }
    });
})(window.jQuery, window);


/** Lens engine code starts here **/
(function($, config) {
    'use strict';

    config = config || {};

    var ShoppingCTALayer = function(options) {
        var t = this;

        // Send Debug point before init the elems
        t.setDebugPointer('Lens_Init_Start');
        // Instance variables
        t.options = $.extend(true, {}, ShoppingCTALayer.defaults, config, options);   // Normalize the options first
        t.restBase = t.options.restBase[t.getEnv(location.hostname)];
        t.sid = t.options.sid || window.sid; // Getting the sid (Source ID) from options or from global
        t.$modal = t.createLensElements(); // Create the lens elements for this instance
        t.$triggerElem = null;
        t.$container = null;
        // t.currentItemId = null; // Holds the current Item ID
        t.currentCta = null; // Holds the current CTA ('pb', 'bo', 'atc')
        t.mainTemplate = null; // Holds the main template for the layer
        t.resourceLoaded = {}; // Flag to hold the resource load status, hashmap to different cta
        t.data = null; // holds the dynamic data
        t.actionHash = null; // Holds the URL lens action hash
        t.dataAttributes = null; // The data attributes associated with the item
        t.inFlight = null; // Object holds the current inflight requests

        t.clientTrackingId = null; //pageId from Vi or PRP
        t.sPTBflNew = null;
        //Tracking Info, now temporary use for placebid resume, will remove if the loading page from ajax call
        t.tracking = {
            'signIn': 'm4975',
            'fallback': 'm4976',
            'clientSignin': 'm4952.l9239',
            'clientFallback': 'm4952.l9240',
            'resume': 'm4952.l9262',
        };
        // Update Lens cache settings with provided options, not use for current version
        ShoppingCTALayer.cache.settings(t.options.cache);
        // Bind the events
        t.listen();

        // Trigger lens action if any, e.g., open the layer with has bolp=1 || cta=placebid;
        t.triggerAction();

        // Send Debug point after init the elems
        t.setDebugPointer('Lens_Init_Complete');
    };

    ShoppingCTALayer.prototype = {

        listen: function() {
            var t = this,
                $triggerElem,
                selector;
                // console.log(t.options);
            // Check if event delegation is needed
            if(t.options.delegator) {
                $triggerElem = $(t.options.delegator); // Trigger elem becomes the delegator
                selector = t.options.trigger; // Event will be delegated to this selector
            } else {
                $triggerElem = $(t.options.trigger); // Trigger will be the actual trigger element
                selector = null; // no selector, apply the event to the trigger itself
            }

            $triggerElem.on('click', selector, function(e) {
                // console.log('trigger');
                // If a meta key is pressed then do the default
                if(e.metaKey) {
                    return true;
                }
                // Start execution & prevent defaults
                t.setDebugPointer('User_Click_Button');
                if(t.exec($(e.currentTarget || e.srcElement))) {
                    // Prevent defaults
                    e.stopPropagation();
                    e.preventDefault();
                }
            });
        },

        getEnv: function(hostname) {

            if (/rproxy/i.test(hostname)) { //matches dev environments
                return 'dev';
            } else if (/(\.|^)qa\.ebay/i.test(hostname)) { //matches QA environments
                return 'qa';
            } else if (/(\.|^)corp\.ebay/i.test(hostname)) { //matches CORP environments
                return 'qa';
            } else if (/(\.|^)dev\.ebay/i.test(hostname)) { //matches pretty URL environments
                return 'qa';
            } else if(/latest/i.test(hostname)) { //matches pre-prod URLs
                return 'preprod';
            }
            return 'prod';
        },

        triggerAction: function() {
            var params = this.getParamsObj();
            if (Object.keys(params).length === 0 || !(params.cta || params.bolp)) {
                return;
            }
            this.currentCta = params.cta;

            if (params.bolp == 1) {
                this.currentCta = 'placebid';
            }

            var $targetElem = $(document).find('[data-cta=' + this.currentCta + ']');
            if (this.options.multiItems) {
                 $targetElem .find('[data-itemId=' + this.params.item + ']');
            }
            if ($targetElem.length > 0) {
                this.dataAttributes = $targetElem.data();
                if (params.maxbid) {
                    this.dataAttributes.maxbid = params.maxbid;
                }
                this.activateLens(this.dataAttributes && this.dataAttributes.cta);
            }
        },

        getParamsObj: function () {
            // This function is anonymous, is executed immediately and
            // the return value is assigned to QueryString!
            var query_string = {};
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i=0;i<vars.length;i++) {
                var pair = vars[i].split("=");
                // If first entry with this name
                if (typeof query_string[pair[0]] === "undefined") {
                  query_string[pair[0]] = decodeURIComponent(pair[1]);
                    // If second entry with this name
                } else if (typeof query_string[pair[0]] === "string") {
                  var arr = [ query_string[pair[0]],decodeURIComponent(pair[1]) ];
                  query_string[pair[0]] = arr;
                    // If third or later entry with this name
                } else {
                  query_string[pair[0]].push(decodeURIComponent(pair[1]));
                }
            }
            return query_string;
        },

        getActionDataAttributes: function(action) {
            if(!action) {
                return null;
            }
            var dataList = action.split('-');
            return {
                "id": dataList[0],
                "var": dataList[1]
            };
        },

        /** Do signin redirection **/
        authRedirect: function(signinURL, actionType, actionData) {
            var redirectURL = this.getRedirectURL(signinURL, actionType, actionData);
            if(redirectURL) {
                window.location = redirectURL;
            }
        },

        getRedirectURL: function(signinURL, actionType, actionData) {
            if(!signinURL) { // Check for signinURL first
                return null;
            }
            var loc = window.location,
                redirectURL = loc.toString().replace(loc.hash, ''),
                variationId = this.dataAttributes && this.dataAttributes['var'],
                delimiter = '|';

            // Normalize action Type & data
            actionType = actionType || '';
            actionData = actionData || '';

            // Add hash to the redirectURL
            redirectURL += '#lensaction=' +
                            this.currentItemId +
                            (variationId? '-' + variationId: '') +
                            delimiter +
                            actionType +
                            delimiter +
                            encodeURIComponent(actionData);
            return signinURL + '&ru=' + encodeURIComponent(redirectURL);
        },

        /** Returns the action type from the hash **/
        getActionType: function(actionHash) {
            if(!actionHash) {
                return null;
            }
            var typeMatch = /#lensaction=[0-9]+-?[0-9]*\|([^\|]+)\|/i.exec(actionHash),
                type = null;
            if(typeMatch) {
                type = typeMatch[1];
            }
            return type;
        },

        /** Returns the action data from the hash **/
        getActionData: function(actionHash) {
            if(!actionHash) {
                return null;
            }
            var dataMatch = /#lensaction=[0-9]+-?[0-9]*\|[^\|]+\|(.+)/i.exec(actionHash),
                data = null;
            if(dataMatch) {
                data = dataMatch[1];
            }
            return data;
        },

        updateDataAttributes: function(obj) {
            this.dataAttributes = $.extend(this.dataAttributes, obj);
        },

        reset: function() {
            // Reset action hash on every close to prevent multiple entries
            if(this.actionHash === window.location.hash) {
                this.actionHash = null;
            }
            // Set currentItemId to null
            this.currentItemId = null;
            // set data attributes to null
            this.dataAttributes = null;
            // abort inflight requests
            if(this.inFlight) {
                this.inFlight.abort();
            }
            // trigger unload event
            this.fire('lensUnload');
        },

        exec: function($elem) {
            // console.log('exec');
            var _this = this;
            // Top level try-catch block to fallback to default browser behavior
            try{
                // get the cta
                var cta = $elem.data('cta');

                // if cta just return
                if(!cta) {
                    return null;
                }
                // set the trigger element
                _this.$triggerElem = $elem;
                // Set the data attributes
                _this.dataAttributes = $elem.data();
                // Tracking
                _this.getClientTrackingId();
                _this.sendTrackingData(_this.sid, true);
                _this.initTimer();
                // Activate the lens
                _this.activateLens(cta);
            } catch(ex) {
                return 0;
            }
            // Return 1 for successfull activation
            return 1;
        },

        initTimer: function() {
            var _this = this;
            _this.sPTBflNew = new Date().getTime();
        },

        setTimer: function() {
            var _this = this;
            var cta = _this.currentCta;
            if (_this.sPTBflNew) {
                var diff = new Date().getTime() - _this.sPTBflNew;
                $(document).trigger('BflTimer', {'type': cta, 'diff': diff, 'kind': 'New', 'sid': 'm5028'});
            }
        },

        activateLens: function(cta) {
            // console.log('active', cta);
            if(!cta) {
                return;
            }
            if (this.checkAuthStatus()) {
                this.setDebugPointer('Activate_Lens');
                // Buile the init content
                this.setInitContent();

                var url = this.buildAjaxUrl(cta);
                // console.log('buildAjaxUrl', url);

                // Set the current Item Id
                // this.currentURL  = url;

                // Show the dialog
                this.show();

                //Set the current CTA
                this.currentCta = cta;

                // Load data & paint when done
                this.load(url, cta);
            }
        },

        setInitContent: function(){
            var _this = this;
            var dataAttrs = _this.dataAttributes;
            var $modalThrobber = _this.$modal.find('.vilens-modal-throbber');
            var $loadingContent = _this.$modal.find('.loading');
            var $loadindElement = _this.$modal.find('.resume');

            if (dataAttrs && dataAttrs.loading && $loadingContent.length === 0) {
                $loadingContent = $('<div class="loading"></div>').text(dataAttrs.loading);
                $loadingContent.appendTo($modalThrobber);
            }
            if (dataAttrs && dataAttrs.initelment && $loadindElement.length === 0) {
                $loadindElement = $(document).find('#' + dataAttrs.initelment).html();
                $loadindElement = $('<div class="resume"></div>').html($loadindElement);
                $loadindElement.appendTo($modalThrobber);
                _this.$modal.on('click', 'div.resume a', function (e) {
                    var href = $(this).attr('href');
                    if (href) {
                        e.preventDefault();
                        _this.closeModal();
                        _this.sendTrackingData(_this.tracking.resume, false);
                        _this.reloadParent(href);
                    }
                })
            }
        },

        checkAuthStatus: function() {
            var _this = this;
            if (_this.dataAttributes) {
                var signinstate = _this.dataAttributes['signinstate'];
                var status = (typeof signinstate === 'string')? signinstate == 'true' : signinstate;
                if (!status && _this.dataAttributes['signinurl']) {
                    // avoid to send the two rover
                    setTimeout(function() {
                        _this.sendTrackingData(_this.tracking.signIn, false);
                    }, 500);
                    var signinurl = _this.buildSigninUrl(_this.dataAttributes['signinurl']);
                    _this.reloadParent(signinurl);
                    return false;
                }
            }
            return true;
        },

        buildSigninUrl: function(url){
            if(!url) { // Check for signinURL first
                return null;
            };

            // console.log(this.dataAttributes, this.options);
            // this.removeURLParameter('cta');
            // url += (url.indexOf("?")!=-1) ? "&cta=" + this.dataAttributes.cta : "?cta=" + this.dataAttributes.cta;
            var baseCTA = encodeURIComponent("cta=" + this.dataAttributes.cta);
            var appendURL = '';

            if (this.dataAttributes && this.dataAttributes['elementid']) {
                var elementId = this.dataAttributes['elementid'];
                var elementParams = this.dataAttributes['elementparams']
                var value = this.getElementValue(elementId);
                if (value && elementParams) {
                   appendURL += "&" + elementParams + "=" + value;
                }
            }

            if (this.options.multiItems && this.dataAttributes.itemId) {
                appendURL += "&item=" + this.dataAttributes.itemId;
            }

            return url.replace(baseCTA, baseCTA + encodeURIComponent(appendURL));
        },

        fallback: function() {
            var _this = this;
            var dataAttributes = _this.dataAttributes;
            if (dataAttributes && dataAttributes['fallbackurl']) {
                _this.sendTrackingData(_this.tracking.fallback, false);
                _this.closeModal();
                _this.reloadParent(dataAttributes['fallbackurl']);
            } else {
                _this.closeModal();
            }
        },

        getCacheKey: function(id) {
            if(!id) {
                return null;
            }
            return id + '-' + this.$modal.data('index');
        },

        getClientTrackingId: function () {
            var _this = this;
            if (_this.dataAttributes && _this.dataAttributes.sid) {
                _this.sid = _this.dataAttributes.sid;
            } else if (_this.dataAttributes && _this.dataAttributes.url){
                var url = _this.dataAttributes && _this.dataAttributes.url;
                var data = _this.getParameterByName('_trksid', url);
                if (data) {
                    _this.sid = data;
                }
            }

            if (_this.sid) {
                _this.clientTrackingId = _this.getPageIdFromSid(_this.sid);
            }
        },

        getPageIdFromSid: function(sid) {
            var regex = /p(\d*)\./;;
            return sid.match(regex)[1];
        },

        sendTrackingData: function (flag, fullTracking) {
            var trackingData = {};
            if (!flag) {
                return;
            }
            if (fullTracking) {
                trackingData.sid = flag;
            } else {
                trackingData.sid = 'p' + this.clientTrackingId + '.' + flag;
            }
            if (Object.keys(trackingData).length > 0) {
                $(document).trigger('rover', trackingData);
            }
        },

        getParameterByName: function (name, url) {
            if (!url) {
                url = window.location.href
            };
            name = name.replace(/[\[\]]/g, "\\$&");
            var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
                results = regex.exec(url);
            if (!results) return null;
            if (!results[2]) return '';
            return decodeURIComponent(results[2].replace(/\+/g, " "));
        },

        buildAjaxUrl: function(cta) {
            var _this = this;
            var dataAttrs = _this.dataAttributes;
            var url;
            var params = [];
            var query = '';

            // Using the passed URL
            if (dataAttrs['url']) {
                url = dataAttrs['url'];
            } else {
            // Or using the default one based on cta
                url = _this.urlHandle(_this.restBase, cta, dataAttrs);
            }

            var sep = /\?/.test(url)? '&':'?';

            // Override sid value if present as a data attribute
            if(dataAttrs && dataAttrs.sid) {
                sid = dataAttrs.sid;
                tracking =  '_trksid=' + sid;
            }

            if(dataAttrs && dataAttrs['params']) {
                var paramsObj = dataAttrs['params'];
                for(key in paramsObj) {
                    params.push(key + '=' + encodeURIComponent(paramsObj[key]));
                }
            }

            if (dataAttrs && dataAttrs['elementid']) {
                var elementId = dataAttrs['elementid'];
                var elementParams = dataAttrs['elementparams']
                var value = this.getElementValue(elementId);
                if (value && elementParams) {
                    params.push(elementParams + '=' + value);
                }
            }

            // maxbid case for url redirect
            if (dataAttrs && dataAttrs.maxbid) {
                var value = dataAttrs.maxbid;
                params.push('maxbid' + '=' + value);
            }

            if(params.length) {
                query = params.join('&');
            }


            return url + sep + query;
        },

        extractItemId: function() {
            var url = location.href;
            if(url) {
                var itemUrlPattern = /http:\/\/[^\/]+\.ebay\.[^\/]+\/(soc\/)?itm\//,
                    cgiUrlPattern = /http:\/\/[^\/]+\.ebay\.[^\/]+\/ws\/eBayISAPI.dll\?ViewItem&item=(\d+)/,
                    itemId,
                    urlParts;
                if(itemUrlPattern.test(url)) {
                    urlParts = url.split('/');
                    itemId = urlParts[urlParts.length - 1].split('?')[0];
                } else if(cgiUrlPattern.test(url)) {
                    urlParts = url.match(cgiUrlPattern);
                    itemId = urlParts[1];
                } else {
                    urlParts = url.split('/');
                    itemId = urlParts[urlParts.length - 1].split('?')[0];
                }
                itemId = parseInt(itemId, 10);
                if(isNaN(itemId)) {
                    itemId = 0;
                }
            }
            return itemId;
        },


        urlHandle: function(restBase, cta, dataAttributes) {
            var params = [],
                itemId = 0,
                query = '',
                key;
            // Using config itemId or extract from url
            itemId = (dataAttributes && dataAttributes.itemId) || this.extractItemId();

            if(this.dataAttributes && this.dataAttributes['params']) {
                var paramsObj = this.dataAttributes['params'];
                for(key in paramsObj) {
                    params.push(key + '=' + encodeURIComponent(paramsObj[key]));
                }
            }

            if (this.dataAttributes && this.dataAttributes['elementid']) {
                var elementId = this.dataAttributes['elementid'];
                var elementParams = this.dataAttributes['elementparams']
                var value = this.getElementValue(elementId);
                if (value && elementParams) {
                    params.push(elementParams + '=' + value);
                }
            }

            // maxbid case for url redirect
            if (this.dataAttributes && this.dataAttributes['maxbid']) {
                var value = this.dataAttributes['maxbid'];
                params.push('maxbid' + '=' + value);
            }

            if(params.length) {
                query = '?' + params.join('&');
            }

            return restBase + '/' + cta + '/' + itemId + query;
        },

        isNumber: function(n) {
          return !isNaN(parseFloat(n)) && isFinite(n);
        },

       getElementValue: function(node){
            var $element = $(document).find('#' + node);
            if ($element && $element.length) {
                var value = $element.val();
                // For IE9 send the placeholder as value
                return value == $element.attr('placeholder') ? '' : value.trim();
            }
        },

        removeURLParameter: function(url, parameter) {
            //prefer to use l.search if you have a location/link object
            var urlparts= url.split('?');
            if (urlparts.length>=2) {

                var prefix= encodeURIComponent(parameter)+'=';
                var pars= urlparts[1].split(/[&;]/g);

                //reverse iteration as may be destructive
                for (var i= pars.length; i-- > 0;) {
                    //idiom for string.startsWith
                    if (pars[i].lastIndexOf(prefix, 0) !== -1) {
                        pars.splice(i, 1);
                    }
                }

                url= urlparts[0] + (pars.length > 0 ? '?' + pars.join('&') : "");
                return url;
            } else {
                return url;
            }
        },

        isAjaxable: function(url) {
            if(!url) {
                return false;
            }
            var urlHost = url.match(/\/\/([^\/]+)\//);
            if(urlHost) {
                // Get the host name alone
                urlHost = urlHost[1];
            }
            if(!urlHost) {
                // it is a relative url so Ajaxable
                return true;
            }
            // Check if the page host is the same as the URL host
            return location.hostname === urlHost;
        },

        fetch: function(url, callback) {
            // console.log('fetch');
            var t = this;
            var dataType = "json";
            t.inFlight = $.ajax({
                dataType: dataType,
                url: url,
                success: function(resp) {
                    callback(resp);
                },
                error: function(jqXHR, error) {
                    if(error !== 'abort') {
                        t.fallback();
                    }
                }
            });
        },

        createContainer: function() {
            // Check if already created, then just return
            if(this.$container) {
                return this.$container;
            }
            // create first
            var $modalBody = $('<div class="vilens-modal-body" id="MODAL_BODY"></div>');
            var $container = $modalBody.appendTo(this.$modal);
            // Add ARIA rolw
            $container.attr('role', 'document');
            // Attach container events
            this.attachContainerEvents($container);
            // assign to instance
            this.$container = $container;
            $container.hide();
            return $container;
        },

        reloadLens: function(id, dataAttributes) {
            this.reset(); // reset first and then activate
            this.dataAttributes = dataAttributes; // Set dataAttributes if any
            this.activateLens(id);
        },

        detachContainerEvents: function($container) {
            // Unbind all container events
            $container.off('lensActivate');
            $container.off('lensClose');
            $container.off('lensAuthenticate');
            $container.off('lensClearCache');
            $container.off('lensResize');
            $container.off('lensUpdateDataAttributes');
        },

        /** Deal with all container event listeners **/
        attachContainerEvents: function($container) {
            var t = this;
            // Event listeners
            $container.on('lensActivate', function(evt, data) {
                t.reloadLens(data.id, data.dataAttributes);
            });
            $container.on('lensClose', function() {
                t.close();
            });
            $container.on('lensAuthenticate', function(evt, data) {
                t.authRedirect(data.signinURL, data.actionType, data.actionData);
            });
            $container.on('lensClearCache', function(evt, data) {
                ShoppingCTALayer.cache.clear(t.getCacheKey(data.id));
            });
            $container.on('lensResize', function() {
                t.resize();
            });
            $container.on('lensUpdateDataAttributes', function(evt, data) {
                t.updateDataAttributes(data);
            });
        },

        resize: function() {
            if(this.$modal) {
                this.$modal.modal('resize');
            }
        },

        processResources: function(resp, cta) {
            var _this = this;
            if (!_this.isValidValue(resp)) {
                _this.closeModal();
                return false;
            }

            if(resp && resp.redirectUrl){
                var pattern = new RegExp('signin');
                if (pattern.test(resp.redirectUrl)) {
                    // for signin case
                    _this.sendTrackingData(_this.tracking.clientSignin, false);
                } else  {
                    // for fallback url case
                    _this.sendTrackingData(_this.tracking.clientFallback, false);
                }
                _this.reloadParent(resp.redirectUrl);
                return false;
            }

            if(resp && resp.fallBackUrl){
                _this.sendTrackingData(_this.tracking.clientFallback, false);
                _this.reloadParent(resp.fallBackUrl);
                return false;
            }

            _this.createContainer();
            // Load resources
            _this.loadResources(resp, cta);
        },

        reloadParent : function(url) {
            top.location.href = url;
        },

        isValidValue : function(value) {
            if (typeof value === 'undefined' || !value || Object.keys(value).length === 0) {
                return false;
            }
            return true;
        },

        checkContainer: function(containerMarkup) {
            // If container markup not present just return false
            if(!containerMarkup) {
                return false;
            }

            var $container = $(containerMarkup),
                idSel = '#' + $container.attr('id'),
                classNames = $container.attr('class'),
                classSel =  classNames? '.' + classNames.replace(/\s+/, '.'): '',
                elem = $(idSel)[0] || $(classSel)[0]; // Check if the container is present by querying ID or class selectors
            if(elem) {
                // Element is already present so assign it and return
                this.$container = $(elem);
                return true;
            }
            return false;
        },

        // Moves the container to the current modal instance
        moveContainer: function() {
            if($.contains(this.$modal[0], this.$container[0])) {
                // Container already in place just resturn
                return;
            }
            // Move the container to the current modal instance
            this.$container = this.$container.appendTo(this.$modal);
            // Detach & attach events back
            this.detachContainerEvents(this.$container);
            this.attachContainerEvents(this.$container);
        },

        fetchResources: function(url, cta) {
            // console.log('fetchResources');
            var t = this;
            t.fetch(url, function(resp) {
                t.processResources(resp, cta);
            });
        },

        loadScript: function(resp) {
            // console.log('loadScript');
            var _this = this;
            var deferred = $.Deferred();
            if (!resp.jsUrl) {
                deferred.reject();
            }
            $.ajax({
                  url: resp.jsUrl,
                  dataType: "script",
                  cache: true,
                  success: function(){
                    // console.log('script', new Date().getTime());
                    deferred.resolve();
                  },
                  error: function(request){
                     deferred.reject();
                  }
            });
            return deferred.promise();
        },

        loadCSS: function(resp){
            // console.log('loadCSS');
            var deferred = $.Deferred();
            if (!resp.cssUrl) {
                return deferred.reject();
            }

            var link = document.createElement('link');
            link.type = 'text/css';
            link.rel = 'stylesheet';
            link.href = resp.cssUrl;

            document.getElementsByTagName('head')[0].appendChild(link);
            var img = document.createElement('img');
            //used to find whether css loaded or not
            img.onerror = function() {
                deferred.resolve();
            };
            img.src = resp.cssUrl;
            return deferred.promise();
        },

        loadResources: function(resp, cta) {
            var _this = this;
            // First check if jsURL is present
            if (!_this.resourceLoaded[_this.currentCta]) {
                $.when(_this.loadCSS(resp), _this.loadScript(resp))
                    .then(_this.loadHTML.bind(this, resp, cta))
                    .fail(_this.fallback.bind(this))
            } else {
                _this.loadHTML(resp, cta)
                    .fail(_this.fallback.bind(this))
            }

        },

        broadcastEvents: function(cta, url) {
            var _this = this;
            var msg = {};
            if (url) {
                msg.url = url;
            }
            if (_this.sPTBflNew) {
                msg.sPTBflNew = _this.sPTBflNew;
            }
            if (cta) {
                $(document).trigger(cta + '_loading_complete', msg);
            }
        },

        loadInlineJs: function(resp, cta) {
            // console.log('loadinlineJs');
            var _this = this;
            if (_this.resourceLoaded[_this.currentCta]) {
                return true;
            }
            _this.resourceLoaded[_this.currentCta] = true;
            if(resp.inlineJs){              
                $('body').append(resp.inlineJs);
                _this.paint(resp, cta);
            }

        },

        loadHTML: function(resp, cta) {
            var _this = this;
            _this.moveContainer();
            // Check if the data is direct markup
            if(resp.html) {
                _this.$container.html(resp.html);
                _this.loadInlineJs(resp, cta);
            }
        },

        paint: function(resp, cta) {
            var _this = this;
            var deferred = $.Deferred();
            // If resource or data not available just return
            if(!_this.resourceLoaded[_this.currentCta]) {
                return;
            }
            // Trigger Lens load event
            _this.fireLensLoad();

            //Send Debug Pointer
            _this.setDebugPointer('Finish_Loading_Layers');

            _this.broadcastEvents(cta);
        },

        centerLayer: function() {
            var $modal = $('.vilens-modal');

            var w = $(window).width();
            var h = $(window).height();
            var mw = $modal.width();
            var mh = $modal.height();
            // console.log('centerLayer()', w, h, mw, mh)

            // make sure the layer doesn't go off screen
            var top = (h - mh)/2 > 0 ? (h - mh)/2 : 0;
            var left = (w - mw)/2 > 0 ? (w - mw)/2 : 0;

            // adjust modal position for viewport
            top += $(document).scrollTop();
            left += $(document).scrollLeft();

            // ajust the top position as the same as old one
            if (top > 10) {
                top -= 10;
            }

            $modal.css('top', top);
            $modal.css('left', left);

        },

        load: function(url, cta) {
            // console.log('load');
            var _this = this;

            // set transition
            _this.transition(true);
            _this.centerLayer();
            _this.attachLayerEvent();
            _this.fetchResources(url, cta);
        },

        attachLayerEvent: function() {
            var _this = this;
            $(window).on('resize', function(){
                _this.centerLayer();
            });
            $(document).on('keyup.close.modal', function (e) {
                if(e.which === 27) {
                    _this.close();
                }
            });

            // trap tab focus within modal for accessibility
            $(document).on('keydown', '.button-placebid.button-placebid-modify > a', function(e) {
                if (e.which === 9 && !e.shiftKey && e.target.parentNode === this.parentNode) {
                    e.preventDefault();
                    $('.vilens-modal-close').focus();
                }
            });

            // trap shift+tab focus within modal for accessibility
            $(document).on('keydown', '.vilens-modal-close', function(e) {
                if (e.keyCode === 9 && e.shiftKey && e.target === this) {
                    e.preventDefault();
                    $('.button-placebid.button-placebid-modify').children()[0].focus();
                }
            });
        },

        fireLensLoad: function() {
            // console.log('fireLensLoad', this.actionHash, this.actionType)
            this.fire('lensLoad', {
                actionType: this.getActionType(this.actionHash),
                actionData: this.getActionData(this.actionHash)
            });
        },

        fire: function(evtName, data) {
            // Fire on the modal container first if present
            if(this.$container) {
                this.$container.trigger(evtName, data);
            }
        },

        transition: function(show) {
            var $modalThrobber = this.$modal.find('.vilens-modal-throbber');
            var $modalBody = this.$modal.find('.vilens-modal-body');

            // Throbber toggling
            if (show) {
                $modalThrobber.show();
                $modalBody.hide();
            } else {
                $modalThrobber.hide();
                // console.log('Show Modal', new Date().getTime());
                $modalBody.show();
                this.setTimer();
            }
        },

        handleData: function(resp) {
            // set the data
            this.data = resp;
            // paint
            this.paint();
        },

        extractWidth: function(width) {
            if(!width) {
                return width;
            }
            var widthPattern = /([0-9]+)(\D*)/.exec(width),
                widthVal = widthPattern && parseInt(widthPattern[1], 10),
                widthUnit = widthPattern && (widthPattern[2] || 'px'), // default to px
                widthObj;
            // Check if the value is present
            if(widthVal) {
                widthObj = {
                    value: widthVal,
                    unit: widthUnit
                };
            }
            return widthObj;
        },

        setDebugPointer: function(state) {
            $(document).trigger('VI_LENS_DEBUG', {'state': state});
        },

        createLensElements: function() {

            // Send Debug point during creating the elems
            this.setDebugPointer('Creating_Element_Start');

            var t = this,
                index = $('div.vilens-modal').length, // Getting the index from previously created lens instances
                zIndex = 10100030 * (index + 1), // Set z-index based on current index
                $modalWrapper = $('<div class="vilens-modal-wrapper"></div>')
                                .attr('id', 'vilens-modal-wrapper' + index)
                                .css('z-index', zIndex),
                $modalBackdrop = $('<div class="vilens-modal-backdrop"></div>')
                                .attr('id', 'vilens-modal-backdrop' + index)
                                .css('z-index', zIndex + 10),
                $modal = $('<div class="vilens-modal" tabindex="-1" role="dialog"></div>')
                                .attr('id', 'vilens-modal' + index)
                                .attr('aria-label', 'placebid-dialog')
                                .css('z-index', zIndex + 20)
                                .data('index', index),
                $modalClose = $('<div class="vilens-modal-close" role="button" tabindex="0"></div>'),
                $modalThrobber = $('<div class="vilens-modal-throbber" id="MODAL_THROBBER"></div>'),
                $modalThrobberIcon = $('<div class="vilens-modal-throbber-icon"></div>'),
                $body = $('body'),
                widthObj = t.extractWidth(t.options.width);

            // If width is present set it in the modal
            if(widthObj) {
                $modal.css({
                    "width": widthObj.value + widthObj.unit
                });
            }

            // Add the elements
            $modalWrapper = $modalWrapper.appendTo($body);
            $modal = $modal.appendTo($modalWrapper);
            $modalClose = $modalClose.appendTo($modal);
            $modalThrobberIcon = $modalThrobberIcon.appendTo($modalThrobber);
            $modalThrobber = $modalThrobber.appendTo($modal);
            $modalBackdrop = $modalBackdrop.appendTo($modalWrapper);

            // Attach events
            $modal.on('hide', function() {
                // Call reset to set the modal to initial state
                t.reset();
                if(t.$triggerElem) {
                    t.$triggerElem.focus();
                }
            });

            $modalClose.on('click', function() {
                t.close();
            });

            // Send Debug point after init the elems
            this.setDebugPointer('Elemment_Init_Complete');

            // Set the modal to instance variable
            return $modal;
        },

        closeModal: function(){
            if(this.$modal) {
                this.$modal.modal('hide');
            }
        },

        close: function() {
            if(this.$modal) {
                this.$modal.modal('hide');
            }
            this.sendTrackingData('l9218', false);
            var cta = this.dataAttributes && this.dataAttributes.cta;
            var url = window.location.href;

            url = this.removeURLParameter(url, 'cta');
            url = this.removeURLParameter(url, 'autorefresh');
            url = this.removeURLParameter(url, 'maxbid');
            url = this.removeURLParameter(url, 'bolp');
            url = url.replace(/#(\w)+/, '');
            url += (url.indexOf("?")!=-1) ? "&autorefresh=true" : "?autorefresh=true";
            // Avoid the refresh and close simultaneously
            setTimeout(function(){
                top.location.href = url;
            }, 50);
        },

        show: function() {
            this.$modal.modal();
        }
    };

    /** Caching utility for lend **/
    ShoppingCTALayer.cache = (function() {
        var hash = {},
            count = 0,
            timer = null,
            prefix = 'i',
            defaults = {
                limit: 10, // Max number of entities in cache
                duration: 1800000 // Duration in milliseconds, an entity is kept in the cache
            },
            options = defaults, // Set options to defaults initially
            isExpired = function(obj) {
                if(!obj) {
                    return null;
                }
                var now = new Date().getTime(),
                    diff = now - obj.ts;

                return diff > options.duration;
            },
            // Runs an LRU algo to recycle the cache entries
            recycle = function() {
                // clear the time first
                clearTimeout(timer);
                timer = null;

                var key,
                    obj,
                    queue = [],
                    length,
                    unusedEntries,
                    i, l;
                // Iterate the hash and get the valid objects in the queue
                for(key in hash) {
                    obj = hash[key];
                    if(isExpired(obj)) {
                        delete hash[key];
                    } else {
                        queue.push(obj);
                    }
                }
                length = queue.length;
                if(length <= options.limit) {
                    count = queue.length;
                    // If the length is less than limit reset count and return
                    return;
                }

                // sort the queue
                queue.sort(function(o1, o2) {
                    return o2.ts - o1.ts;
                });
                // Get the unused entries
                unusedEntries = queue.splice(options.limit, length);
                // Remove them from hash
                for(i = 0, l = unusedEntries.length; i < l; i++) {
                    delete hash[unusedEntries[i].key];
                }
                // Reset count
                count = queue.length;
            },
            scheduleRecycle = function() {
                if(timer) {
                    // A recycle is already scheduled so just return
                    return;
                }
                timer = setTimeout(function() {
                    recycle();
                }, 1000);
            };

        return {
            get: function(id) {
                var obj = hash[prefix + id];
                // Check for expiry and return
                return obj && !isExpired(obj)? obj.data: null;
            },

            set: function(id, obj) {
                var key = prefix + id;
                if(!hash[key]) {
                    // only if not present add to hash
                    hash[key] = {
                        key: key,
                        data: obj,
                        ts: new Date().getTime()
                    };
                    // increment count
                    count++;
                }
                if(count > options.limit) {
                    scheduleRecycle();
                }
            },

            clear: function(id) {
                // If id not present then clear the entire cache
                if(!id) {
                    hash = {}; // reset hash
                    count = 0; // reset count
                    return;
                }
                var key = prefix + id;
                if(hash[key]) {
                    delete hash[key];
                    count--;
                }
            },

            getSize: function() {
                return count;
            },

            settings: function(newOptions) {
                if(typeof newOptions !== 'object') {
                    return options;
                }
                $.extend(options, newOptions);
                return options;
            }
        };
    })();

    /** Styles needed for the lensing engine **/
    ShoppingCTALayer.style = [
        '<style type="text/css">',
            'body.prevent-scroll{ overflow: scroll !important;}\
            .vilens-zoom{cursor:pointer}\
            .vilens-modal{box-shadow: 20px 20px 45px -22px;-webkit-backface-visibility:hidden;backface-visibility:hidden;box-sizing:border-box;outline:0;position:absolute;top:50%;left:50%;margin:auto;max-width:980px;background:#fff;border-radius:2px;margin-top:-21px;}\
            .vilens-modal-backdrop,.vilens-modal-wrapper{box-sizing:border-box;left:0;position:absolute;top:0}\
            .vilens-modal-wrapper{display:none;bottom:0;right:0}\
            .vilens-modal-backdrop{background-color:grey;height:100%;-moz-opacity:.3;opacity:.3;filter:alpha(opacity=30);overflow:hidden;width:100%;position:fixed;}\
            .vilens-modal-close{cursor:pointer;background:url(//ir.ebaystatic.com/pictures/aw/pics/cmp/ds3/sprds3_11.png) -340px -126px no-repeat;height:13px;width:13px;display:block;float:right;margin:10px 10px 0 0}\
            .vilens-modal-close:hover{background-position:-356px -126px}.vilens-modal-close:focus{outline:dotted 1px}\
            .vilens-modal-throbber{font-family:Helvetica,Neue;line-height:normal;font-size:13px;padding-top:40px}\
            .vilens-modal-throbber-icon{background:url(//ir.ebaystatic.com/pictures/aw/pics/globalAssets/imgLoading_30x30.gif) 50% 50% no-repeat #FFF;min-height:40px}\
            .vilens-modal-throbber .loading{text-align:center;padding-top:10px;color:#666}\
            .vilens-modal-throbber .resume a{text-decoration:none}\
            .vilens-modal-throbber .resume{padding:70px 20px 20px;color:#999}',
        '</style>'
    ].join('');
    // Append the styles to the body
    $('body').append(ShoppingCTALayer.style);

    /** Lens defaults to item layer config **/
    ShoppingCTALayer.defaults = {
        "trigger": ".vilens-item", // Selector which triggers the lensing layer
        "restBase": {
            "dev": "http://rproxy.qa.ebay.com:3008/bfl",
            "qa": "http://www.qa.ebay.com/bfl",
            "preprod": "http://www.latest.ebay.com/bfl",
            "prod": "http://www.ebay.com/bfl"
        },
        "delegator": null,
        "cache": true,
        "dataHandler": null, // Optional handler to be overriden by application team, if they provide data
        "resourceData": null, // If resourceData is provided, the JSON call to retrive the resources will not be made.
        "width": '540px', // A width override for the modal dialog. Default is 540px
        "multiItems": false //handle multiItems or not, default is false--single item only in page
    };

    // Create Lens instance if the loaded script indicates to self initialize
    if($('script[data-init="true"]').length) {
        new ShoppingCTALayer();
    }

    // Assigning Lens to glocal scope
    window.ShoppingCTALayer = ShoppingCTALayer;

})(window.jQuery, window.LensConfig);