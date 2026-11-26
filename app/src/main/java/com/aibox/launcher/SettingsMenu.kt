package com.aibox.launcher

import android.app.Activity
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.PopupWindow
import android.widget.TextView
import androidx.appcompat.widget.SwitchCompat

/** 右上角設定選單。尺寸全部依螢幕比例(u)計算,直立大螢幕上也有足夠的觸控面積 */
object SettingsMenu {
    class Item(
        val icon: Int,
        val title: String,
        val divider: Boolean = false,              // 在這一列上方畫分隔線
        val state: (() -> Boolean)? = null,        // 有值 = 開關項目(點了選單不關閉)
        val action: () -> Unit
    )

    fun show(act: Activity, anchor: View, items: List<Item>) {
        val u = Ui.unit(act)
        fun pu(v: Float) = (v * u).toInt()
        val accent = act.getColor(R.color.accent)
        val cardW = pu(62f)

        val card = LinearLayout(act).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pu(1f), pu(1.2f), pu(1f), pu(1.2f))
            background = GradientDrawable().apply {
                cornerRadius = pu(4.5f).toFloat()
                setColor(act.getColor(R.color.card))
                setStroke(maxOf(1, pu(0.15f)), act.getColor(R.color.glass_stroke))
            }
            elevation = pu(2.5f).toFloat()
        }
        // 外層留白,讓陰影不會被裁掉
        val container = FrameLayout(act).apply {
            setPadding(pu(3f), pu(1f), pu(3f), pu(4f))
            addView(card, FrameLayout.LayoutParams(cardW, ViewGroup.LayoutParams.WRAP_CONTENT))
        }

        lateinit var pw: PopupWindow
        val ripple = TypedValue().also { act.theme.resolveAttribute(android.R.attr.selectableItemBackground, it, true) }

        items.forEach { item ->
            if (item.divider) {
                card.addView(View(act).apply { setBackgroundColor(act.getColor(R.color.chip)) },
                    LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, maxOf(1, pu(0.15f)))
                        .apply { setMargins(pu(2f), pu(0.8f), pu(2f), pu(0.8f)) })
            }
            val icon = ImageView(act).apply {
                setImageResource(item.icon)
                setColorFilter(accent)
                setPadding(pu(1.5f), pu(1.5f), pu(1.5f), pu(1.5f))
                background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor((0x22 shl 24) or (accent and 0xFFFFFF)) }
            }
            val title = TextView(act).apply {
                text = item.title
                setTextColor(act.getColor(R.color.text))
                setTextSize(TypedValue.COMPLEX_UNIT_PX, 3.1f * u)
            }
            val sw = item.state?.let { st -> SwitchCompat(act).apply { isChecked = st(); isClickable = false } }

            val row = LinearLayout(act).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(pu(1.8f), pu(1.5f), pu(2.2f), pu(1.5f))
                setBackgroundResource(ripple.resourceId)
                addView(icon, LinearLayout.LayoutParams(pu(7.5f), pu(7.5f)))
                addView(title, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
                    .apply { marginStart = pu(2f) })
                if (sw != null) addView(sw)
                setOnClickListener {
                    if (sw != null) { item.action(); sw.isChecked = item.state!!() }   // 開關:選單保持開啟
                    else { pw.dismiss(); item.action() }
                }
            }
            card.addView(row)
        }

        pw = PopupWindow(container, cardW + pu(6f), ViewGroup.LayoutParams.WRAP_CONTENT, true).apply {
            setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            isOutsideTouchable = true
        }
        // 從右上角(按鈕位置)淡入 + 輕微放大展開
        container.alpha = 0f
        container.scaleX = 0.92f; container.scaleY = 0.92f
        container.pivotX = (cardW + pu(6f) - pu(4f)).toFloat(); container.pivotY = 0f
        pw.showAsDropDown(anchor, 0, pu(1f), Gravity.END)
        container.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(160).start()
    }
}
