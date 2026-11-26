package com.aibox.launcher

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.GridView
import android.widget.ImageView
import android.widget.TextView

class AppsActivity : BaseActivity() {
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        setContentView(R.layout.activity_apps)
        reserveBottom(findViewById<android.view.ViewGroup>(android.R.id.content).getChildAt(0))
        findViewById<View>(R.id.back).setOnClickListener { finish() }
        val apps = Apps.list(this)
        val grid = findViewById<GridView>(R.id.grid)
        grid.adapter = object : BaseAdapter() {
            override fun getCount() = apps.size
            override fun getItem(p: Int) = apps[p]
            override fun getItemId(p: Int) = p.toLong()
            override fun getView(p: Int, cv: View?, parent: ViewGroup): View {
                val v = cv ?: layoutInflater.inflate(R.layout.item_app, parent, false)
                v.findViewById<ImageView>(R.id.icon).setImageDrawable(apps[p].icon)
                v.findViewById<TextView>(R.id.label).text = apps[p].label
                return v
            }
        }
        grid.setOnItemClickListener { _, _, p, _ -> Apps.open(this, apps[p].pkg) }
    }
}
