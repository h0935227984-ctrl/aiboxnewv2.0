package com.aibox.launcher

import android.app.Activity
import android.view.View
import android.view.ViewGroup
import android.widget.GridLayout
import android.widget.ImageView
import android.widget.TextView

/** 把分割組合畫成像手機資料夾:上下兩個 App 圖示疊在一個圓角方塊裡 */
object Folders {
    fun fill(
        a: Activity, grid: GridLayout, list: List<Combo>, showDelete: Boolean,
        onWallpaper: Boolean = false, onDelete: (Int) -> Unit
    ) {
        grid.removeAllViews()
        val dm = a.resources.displayMetrics
        grid.columnCount = maxOf(3, ((dm.widthPixels / dm.density - 48f) / 116f).toInt())
        list.forEachIndexed { i, c ->
            val v = a.layoutInflater.inflate(R.layout.item_folder, grid, false)
            v.findViewById<ImageView>(R.id.iconTop).setImageDrawable(Apps.icon(a, c.top))
            v.findViewById<ImageView>(R.id.iconBottom).setImageDrawable(Apps.icon(a, c.bottom))
            v.findViewById<TextView>(R.id.caption).apply {
                text = "${Apps.label(a, c.top)} + ${Apps.label(a, c.bottom)}"
                if (onWallpaper) {
                    setTextColor(android.graphics.Color.WHITE)
                    setShadowLayer(6f, 0f, 2f, 0x99000000.toInt())
                }
            }
            v.findViewById<View>(R.id.del).apply {
                visibility = if (showDelete) View.VISIBLE else View.GONE
                setOnClickListener { onDelete(i) }
            }
            v.setOnClickListener { Split.launch(a, c) }
            v.layoutParams = GridLayout.LayoutParams(
                GridLayout.spec(GridLayout.UNDEFINED),
                GridLayout.spec(GridLayout.UNDEFINED, GridLayout.FILL, 1f)
            ).apply { width = 0; height = ViewGroup.LayoutParams.WRAP_CONTENT }
            grid.addView(v)
        }
    }
}
