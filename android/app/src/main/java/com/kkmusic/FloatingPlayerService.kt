package com.kkmusic

import android.animation.ValueAnimator
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Outline
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.text.TextUtils
import android.transition.AutoTransition
import android.transition.TransitionManager
import android.view.*
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.*
import org.json.JSONArray
import java.net.URL
import kotlin.math.abs

class FloatingPlayerService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var floatingView: View
    private lateinit var params: WindowManager.LayoutParams
    private var isExpanded = false
    
    private var isDarkMode = true 
    
    private var lastImageUrl: String = ""
    private var lastQueueJson: String = ""
    private var isUserSeeking = false

    // 🔥 MARQUEE FIX: Added a lock so the timer doesn't reset every second!
    private var isMarqueeWaiting = false
    private val marqueeHandler = Handler(Looper.getMainLooper())
    private val marqueeRunnable = Runnable {
        floatingView.findViewById<TextView>(R.id.col_title)?.isSelected = true
        floatingView.findViewById<TextView>(R.id.exp_title)?.isSelected = true
        isMarqueeWaiting = false
    }

    private val updateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            intent?.let {
                
                // 1. Theme Data
                if (it.hasExtra("isDarkMode")) {
                    isDarkMode = it.getBooleanExtra("isDarkMode", true)
                    applyTheme()
                }

                // 2. Text Data (Only update if changed to avoid breaking Marquee)
                if (it.hasExtra("title")) {
                    val title = it.getStringExtra("title") ?: "Unknown"
                    val colTitle = floatingView.findViewById<TextView>(R.id.col_title)
                    val expTitle = floatingView.findViewById<TextView>(R.id.exp_title)
                    
                    if (colTitle?.text?.toString() != title) {
                        colTitle?.text = title
                        expTitle?.text = title
                        
                        // Stop marquee on song change and reset the lock
                        marqueeHandler.removeCallbacks(marqueeRunnable)
                        isMarqueeWaiting = false
                        colTitle?.isSelected = false
                        expTitle?.isSelected = false
                    }
                }

                // 3. Fast Progress Slider Data
                if (it.hasExtra("progress") && it.hasExtra("duration")) {
                    val progress = it.getIntExtra("progress", 0)
                    val duration = it.getIntExtra("duration", 100)
                    
                    floatingView.findViewById<ProgressBar>(R.id.col_progress)?.apply {
                        max = duration
                        this.progress = progress
                    }
                    floatingView.findViewById<SeekBar>(R.id.exp_slider)?.apply {
                        max = duration
                        if (!isUserSeeking) {
                            this.progress = progress
                        }
                    }
                }

                // 4. Play/Pause State & Marquee Trigger
                if (it.hasExtra("isPlaying")) {
                    val isPlaying = it.getBooleanExtra("isPlaying", false)
                    val playBtn = floatingView.findViewById<ImageButton>(R.id.btn_play)
                    val colTitle = floatingView.findViewById<TextView>(R.id.col_title)
                    val expTitle = floatingView.findViewById<TextView>(R.id.exp_title)

                    if (isPlaying) {
                        playBtn?.setImageResource(android.R.drawable.ic_media_pause)
                        
                        // 🔥 Smart Marquee: Only start timer if NOT selected and NOT waiting!
                        if (colTitle != null && !colTitle.isSelected && !isMarqueeWaiting) {
                            isMarqueeWaiting = true
                            marqueeHandler.removeCallbacks(marqueeRunnable)
                            marqueeHandler.postDelayed(marqueeRunnable, 2000)
                        }
                    } else {
                        playBtn?.setImageResource(android.R.drawable.ic_media_play)
                        
                        // 🔥 Stop and snap back to start instantly
                        marqueeHandler.removeCallbacks(marqueeRunnable)
                        isMarqueeWaiting = false
                        colTitle?.isSelected = false
                        expTitle?.isSelected = false
                    }
                }

                // 5. Heavy Image Data
                if (it.hasExtra("imageUrl")) {
                    val imageUrl = it.getStringExtra("imageUrl") ?: ""
                    
                    if (imageUrl.isEmpty()) {
                        floatingView.findViewById<ImageView>(R.id.col_image)?.apply {
                            scaleType = ImageView.ScaleType.CENTER 
                            setImageResource(R.drawable.ic_music_note) 
                            setBackgroundColor(Color.parseColor("#5d5d5d"))
                        }
                        floatingView.findViewById<ImageView>(R.id.exp_image)?.apply {
                            scaleType = ImageView.ScaleType.CENTER
                            setImageResource(R.drawable.ic_music_note)
                            setBackgroundColor(Color.parseColor("#5d5d5d"))
                        }
                        lastImageUrl = ""
                    } else if (imageUrl != lastImageUrl) {
                        lastImageUrl = imageUrl
                        
                        floatingView.findViewById<ImageView>(R.id.col_image)?.scaleType = ImageView.ScaleType.CENTER_CROP
                        floatingView.findViewById<ImageView>(R.id.exp_image)?.scaleType = ImageView.ScaleType.CENTER_CROP
                        
                        loadImage(imageUrl, floatingView.findViewById(R.id.col_image))
                        loadImage(imageUrl, floatingView.findViewById(R.id.exp_image))
                    }
                }

                // 6. Heavy Queue Data
                if (it.hasExtra("queue")) {
                    val queueJson = it.getStringExtra("queue") ?: ""
                    if (queueJson.isNotEmpty() && queueJson != lastQueueJson) {
                        lastQueueJson = queueJson
                        buildQueueUI(queueJson)
                    }
                }
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        
        floatingView = LayoutInflater.from(this).inflate(R.layout.floating_player, null)
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            x = 0
            y = 300 
        }

        windowManager.addView(floatingView, params)
        applyTheme()
        setupInteractions()

        val filter = IntentFilter("UPDATE_FLOATING_PLAYER")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(updateReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(updateReceiver, filter)
        }

        // 🔥 FIX FOR BLANK WIDGET: Tell React Native the widget just opened!
        sendActionToReact("WIDGET_OPENED")
    }

    private fun applyTheme() {
        val card = floatingView.findViewById<View>(R.id.player_card)
        val textColor = if (isDarkMode) Color.WHITE else Color.BLACK
        val bgColor = if (isDarkMode) Color.parseColor("#282828") else Color.WHITE

        val bgDrawable = card.background as? GradientDrawable
        bgDrawable?.setColor(bgColor)

        floatingView.findViewById<TextView>(R.id.col_title)?.setTextColor(textColor)
        floatingView.findViewById<TextView>(R.id.exp_title)?.setTextColor(textColor)
        floatingView.findViewById<TextView>(R.id.text_next)?.setTextColor(if (isDarkMode) Color.LTGRAY else Color.DKGRAY)

        val tintColor = if (isDarkMode) Color.WHITE else Color.BLACK
        floatingView.findViewById<ImageButton>(R.id.btn_play)?.setColorFilter(tintColor)
        floatingView.findViewById<ImageButton>(R.id.btn_prev)?.setColorFilter(tintColor)
        floatingView.findViewById<ImageButton>(R.id.btn_next)?.setColorFilter(tintColor)

        val queueContainer = floatingView.findViewById<LinearLayout>(R.id.queue_container)
        queueContainer?.let {
            for (i in 0 until it.childCount) {
                val itemLayout = it.getChildAt(i) as? LinearLayout
                val textView = itemLayout?.getChildAt(1) as? TextView
                textView?.setTextColor(textColor)
            }
        }
    }

    private fun setupInteractions() {
        val playerCard = floatingView.findViewById<ViewGroup>(R.id.player_card)
        val animationContainer = floatingView.findViewById<ViewGroup>(R.id.animation_container)
        val collapsedView = floatingView.findViewById<View>(R.id.collapsed_view)
        val expandedView = floatingView.findViewById<View>(R.id.expanded_view)

        val scale = resources.displayMetrics.density
        val collapsedWidthPx = (110 * scale + 0.5f).toInt()
        val expandedWidthPx = (340 * scale + 0.5f).toInt()

        var initialY = 0
        var initialTouchY = 0f
        var isDragging = false

        playerCard?.setOnTouchListener { view, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialY = params.y
                    initialTouchY = event.rawY
                    isDragging = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val yDiff = event.rawY - initialTouchY
                    if (abs(yDiff) > 10) { 
                        isDragging = true
                        params.y = initialY + yDiff.toInt()
                        windowManager.updateViewLayout(floatingView, params)
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!isDragging) {
                        isExpanded = !isExpanded

                        if (isExpanded) {
                            collapsedView?.animate()?.alpha(0f)?.setDuration(150)?.withEndAction {
                                collapsedView.visibility = View.GONE
                                expandedView?.alpha = 0f
                                expandedView?.visibility = View.VISIBLE
                                expandedView?.animate()?.alpha(1f)?.setDuration(150)?.start()
                            }?.start()
                        } else {
                            expandedView?.animate()?.alpha(0f)?.setDuration(150)?.withEndAction {
                                expandedView.visibility = View.GONE
                                collapsedView?.alpha = 0f
                                collapsedView?.visibility = View.VISIBLE
                                collapsedView?.animate()?.alpha(1f)?.setDuration(150)?.start()
                            }?.start()
                        }

                        val widthAnimator = if (isExpanded) {
                            ValueAnimator.ofInt(collapsedWidthPx, expandedWidthPx)
                        } else {
                            ValueAnimator.ofInt(expandedWidthPx, collapsedWidthPx)
                        }

                        widthAnimator.addUpdateListener { animator ->
                            playerCard.layoutParams.width = animator.animatedValue as Int
                            windowManager.updateViewLayout(floatingView, params)
                        }
                        widthAnimator.duration = 300
                        widthAnimator.interpolator = AccelerateDecelerateInterpolator()
                        widthAnimator.start()
                    }
                    true
                }
                else -> false
            }
        }

        floatingView.findViewById<ImageButton>(R.id.btn_play)?.setOnClickListener { sendActionToReact("TOGGLE_PLAY") }
        floatingView.findViewById<ImageButton>(R.id.btn_next)?.setOnClickListener { sendActionToReact("NEXT_SONG") }
        floatingView.findViewById<ImageButton>(R.id.btn_prev)?.setOnClickListener { sendActionToReact("PREV_SONG") }

        floatingView.findViewById<SeekBar>(R.id.exp_slider)?.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {}

            override fun onStartTrackingTouch(seekBar: SeekBar?) {
                isUserSeeking = true
            }

            override fun onStopTrackingTouch(seekBar: SeekBar?) {
                isUserSeeking = false
                seekBar?.let {
                    sendActionToReact("SEEK_${it.progress}")
                }
            }
        })
    }

    private fun buildQueueUI(queueJsonString: String) {
        val container = floatingView.findViewById<LinearLayout>(R.id.queue_container)
        container.removeAllViews()

        try {
            val jsonArray = JSONArray(queueJsonString)
            for (i in 0 until jsonArray.length()) {
                val song = jsonArray.getJSONObject(i)
                val id = if (song.has("id")) song.getString("id") else ""
                val title = if (song.has("title")) song.getString("title") else "Unknown"
                val artwork = if (song.has("artwork")) song.getString("artwork") else ""

                val itemLayout = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    gravity = Gravity.CENTER
                    setPadding(10, 0, 10, 0)
                }

                val imageView = ImageView(this).apply {
                    layoutParams = LinearLayout.LayoutParams(120, 120) 

                    if (artwork.isEmpty()) {
                        scaleType = ImageView.ScaleType.CENTER
                        setImageResource(R.drawable.ic_music_note)
                        setBackgroundColor(Color.parseColor("#717171")) 
                    } else {
                        scaleType = ImageView.ScaleType.CENTER_CROP
                        setBackgroundColor(Color.parseColor("#DDDDDD"))
                    }
                    
                    outlineProvider = object : ViewOutlineProvider() {
                        override fun getOutline(view: View, outline: Outline) {
                            outline.setRoundRect(0, 0, view.width, view.height, 16f)
                        }
                    }
                    clipToOutline = true
                }
                
                if (artwork.isNotEmpty()) loadImage(artwork, imageView)

                val textView = TextView(this).apply {
                    text = title
                    textSize = 10f
                    setTextColor(if (isDarkMode) Color.WHITE else Color.BLACK)
                    layoutParams = LinearLayout.LayoutParams(120, ViewGroup.LayoutParams.WRAP_CONTENT)
                    
                    maxLines = 2
                    ellipsize = TextUtils.TruncateAt.END

                    gravity = Gravity.START or Gravity.CENTER_VERTICAL
                    setPadding(0, 5, 0, 0) 
                }

                itemLayout.addView(imageView) 
                itemLayout.addView(textView)

                itemLayout.setOnClickListener {
                    sendActionToReact("PLAY_ID_$id") 
                }

                container.addView(itemLayout)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun loadImage(url: String, imageView: ImageView?) {
        if (imageView == null) return
        Thread {
            try {
                val stream = URL(url).openStream()
                val bitmap = BitmapFactory.decodeStream(stream)
                Handler(Looper.getMainLooper()).post {
                    imageView.setImageBitmap(bitmap)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }

    private fun sendActionToReact(action: String) {
        val intent = Intent("FLOATING_ACTION")
        intent.setPackage(packageName) 
        intent.putExtra("action", action)
        sendBroadcast(intent)
    }

    override fun onDestroy() {
        super.onDestroy()
        marqueeHandler.removeCallbacks(marqueeRunnable)
        if (::floatingView.isInitialized) windowManager.removeView(floatingView)
        unregisterReceiver(updateReceiver)
    }
}