(function($) {

  // ### Defaults

  var defaultSettings = {
    slots            : 1,     // x > 0
    maxPlayCount     : null,  // x >= 0 or null
    speed            : 10,    // x > 0
    stopImageNumber  : null,  // x >= 0 or null or -1
    rollCount        : 3,     // x >= 0
    duration         : 3,     // (x seconds)
    resetOnStop      : false, // resets the roll position on stop
    isVertical       : true,  // roll direction, true = vertical, false = horizontal
    stopCallback     : function() {},
    startCallback    : function() {},
    slowDownCallback : function() {}
  };

  var defaultProperty = {

    // ### General

    $rouletteTarget         : null,
    imageCount              : null,
    $images                 : null,
    originalStopImageNumber : null,

    // ### Dimensions

    totalSize : null,
    position  : 0,

    // ### Distances

    distance              : 0,
    maxDistance           : null,
    runUpDistance         : null,
    slowDownStartDistance : null,

    // ### States

    playCount     : 0,
    isRunUp       : true,
    isSlowdown    : false,
    isStop        : false,
    slowdownTimer : null,

    // ### Misc

    isIE : navigator.userAgent.toLowerCase().indexOf('msie') > -1 // TODO IE
  };

  // ### Plugin

  function Roulette(options) {
    var p = $.extend({}, defaultSettings, options, defaultProperty);

    // ### Internal Methods

    /**
     * Resets the roulette roller.
     * @return {Void}
     */
    function reset() {
      p.maxDistance           = defaultProperty.maxDistance;
      p.slowDownStartDistance = defaultProperty.slowDownStartDistance;
      p.distance              = defaultProperty.distance;
      p.isRunUp               = defaultProperty.isRunUp;
      p.isSlowdown            = defaultProperty.isSlowdown;
      p.isStop                = defaultProperty.isStop;
      if (p.resetOnStop) {
        p.position = defaultProperty.position;
      }
      clearTimeout(p.slowDownTimer);
    }

    /**
     * Sets up the slowdown of the roll.
     * @return {Void}
     */
    function slowDownSetup() {
      if (p.isSlowdown) {
        return;
      }
      p.slowDownCallback();
      p.isSlowdown            = true;
      p.slowDownStartDistance = p.distance;
      p.maxDistance           = p.distance + (2 * p.totalSize);
      p.maxDistance          += p.imageSize - p.position % p.imageSize;
      if (p.stopImageNumber != null) {
        p.maxDistance += (p.totalSize - (p.maxDistance % p.totalSize) + (p.stopImageNumber * p.imageSize)) % p.totalSize;
      }
    }

    /**
     * Starts the roll, and recurses the roll every 1ms
     * @return {Void}
     */
    function roll() {
      var speed_ = p.speed;

      if (p.isRunUp) {
        if (p.distance <= p.runUpDistance) {
          var rate_ = ~~((p.distance / p.runUpDistance) * p.speed);
          speed_    = rate_ + 1;
        } else {
          p.isRunUp = false;
        }
      } else if (p.isSlowdown) {
        var rate_ = ~~(((p.maxDistance - p.distance) / (p.maxDistance - p.slowDownStartDistance)) * (p.speed));
        speed_    = rate_ + 1;
      }

      if (p.maxDistance && p.distance >= p.maxDistance) {
        p.isStop = true;
        reset();
        p.stopCallback(p.$rouletteTarget.find('img').eq(p.stopImageNumber));
        return;
      }

      p.distance += speed_;
      p.position += speed_;

      if (p.position >= p.totalSize) {
        p.position = p.position - p.totalSize;
      }

      if (p.isVertical) {
        if (p.isIE) {
          p.$rouletteTarget.css('top', '-' + p.position + 'px');
        } else {
          p.$rouletteTarget.css('transform', 'translate(0px, -' + p.position + 'px)');
        }
      } else {
        if (p.isIE) {
          p.$rouletteTarget.css('left', '-' + p.position + 'px');
        } else {
          p.$rouletteTarget.css('transform', 'translate(-' + p.position + 'px, 0px)');
        }
      }

      setTimeout(roll, 1);
    }

    // ### Public Methods

    return {

      /**
       * Sets up the roulette.
       * @param  {Object} $roulette
       * @return {Void}
       */
      init: function($roulette) {
        $roulette.css({ 'overflow' : 'hidden' });

        defaultProperty.originalStopImageNumber = p.stopImageNumber;

        // ### Images
        // Sets up the roulette images and calculate roulette dimensions.

        if (!p.$images) {
          p.$images    = $roulette.find('img').remove();
          p.imageCount = p.$images.length;
          p.$images.eq(0).bind('load', function() {
            p.imageSize     = $(this).height(); // images must be a square, we use height to fetch size
            p.totalSize     = p.imageCount * p.imageSize;
            p.runUpDistance = 2 * p.imageSize;
            $roulette.css({
              height : (p.imageSize + 'px'),
              width  : p.isVertical ? p.imageSize : (p.totalSize + (p.imageSize * p.slots))
            });
          }).each(function() {
            if (this.complete || this.complete === undefined){
              var src  = this.src;
              this.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="; // set BLANK placeholder while images are loading
              this.src = src;
            }
          });
        }

        // ### Image CSS
        // Sets up the css options for the images.

        p.$images.css({
          display : p.isVertical ? 'block' : 'inline'
        });

        // ### Remove divs
        // Remove any divs that has been defined, this will be replaced by our own roulette-inner.

        $roulette.find('div').remove();

        // ### Roulette Inner
        // Sets up the inner roulette div that is used for the roll animation.

        p.$rouletteTarget = $('<div>').css({
          left     : 0,
          position : 'relative',
          top      : 0
        }).attr('class', 'roulette-inner');
        $roulette.append(p.$rouletteTarget); // Append the inner roulette wrapper to the primary roulette element
        p.$rouletteTarget.append(p.$images); // Append images to the roulette
        for (var i = 0, len = p.slots; i < len; i++) {
          p.$rouletteTarget.append(p.$images.eq(i).clone());
        }
        $roulette.show();
      },

      /**
       * Starts the roulette.
       * @return {Void} [description]
       */
      start: function() {
        p.playCount++;
        if (p.maxPlayCount && p.playCount > p.maxPlayCount) {
          return;
        }
        p.stopImageNumber = $.isNumeric(
          defaultProperty.originalStopImageNumber) &&
          Number(defaultProperty.originalStopImageNumber) >= 0
            ? Number(defaultProperty.originalStopImageNumber)
            : Math.floor(Math.random() * p.imageCount
        );
        p.startCallback();
        roll();
        p.slowDownTimer = setTimeout(function(){
          slowDownSetup();
        }, p.duration * 1000);
      },

      /**
       * Stops the roulette.
       * @param  {Object} option
       * @return {Void}
       */
      stop: function(option) {
        if (!p.isSlowdown) {
          if (option) {
            var stopImageNumber = Number(option.stopImageNumber);
            if (0 <= stopImageNumber && stopImageNumber <= (p.imageCount - 1)) {
              p.stopImageNumber = option.stopImageNumber;
            }
          }
          slowDownSetup();
        }
      },

      /**
       * Updates the options of the roulette.
       * @param  {Object} options
       * @return {Void}
       */
      option: function(options) {
        p          = $.extend(p, options);
        p.speed    = Number(p.speed);
        p.duration = Number(p.duration);
        p.duration = p.duration > 1 ? p.duration - 1 : 1;
        defaultProperty.originalStopImageNumber = options.stopImageNumber;
      }

    };
  }

  // ### Plugin Export

  $.fn['roulette'] = function(method, options) {
    return this.each(function() {
      var self     = $(this);
      var roulette = self.data('plugin_roulette');
      if (roulette) {
        if (roulette[method]) {
          roulette[method](options);
        } else {
          console && console.error('Method ' + method + ' does not exist on jQuery.roulette');
        }
      } else {
        roulette = new Roulette(method);
        roulette.init(self, method);
        $(this).data('plugin_roulette', roulette);
      }
    });
  }

})(jQuery);
