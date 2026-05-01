import plotly.graph_objects as go

from visualizations.colors import CITI_BLUE, MEMBER_COLOR, CASUAL_COLOR, POSITIVE, NEGATIVE


def base_layout(fig: go.Figure, title: str = "", height: int = 400) -> go.Figure:
    fig.update_layout(
        title=title,
        height=height,
        margin=dict(l=40, r=20, t=40 if title else 20, b=40),
        plot_bgcolor="white",
        paper_bgcolor="white",
        font=dict(size=12),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        xaxis=dict(showgrid=False),
        yaxis=dict(showgrid=True, gridcolor="#F0F0F0"),
    )
    return fig


def create_trend_chart(df, x, y, color=None, title="", height=400, chart_type="line"):
    fig = go.Figure()
    if color and color in df.columns:
        color_map = {"member": MEMBER_COLOR, "casual": CASUAL_COLOR}
        for val in df[color].unique():
            sub = df[df[color] == val].sort_values(x)
            c = color_map.get(val, CITI_BLUE)
            if chart_type == "area":
                fig.add_trace(go.Scatter(x=sub[x], y=sub[y], name=val.title(), fill="tonexty", line=dict(color=c)))
            elif chart_type == "bar":
                fig.add_trace(go.Bar(x=sub[x], y=sub[y], name=val.title(), marker_color=c))
            else:
                fig.add_trace(go.Scatter(x=sub[x], y=sub[y], name=val.title(), line=dict(color=c)))
    else:
        if chart_type == "bar":
            fig.add_trace(go.Bar(x=df[x], y=df[y], marker_color=CITI_BLUE))
        else:
            fig.add_trace(go.Scatter(x=df[x], y=df[y], line=dict(color=CITI_BLUE)))
    if chart_type == "bar" and color:
        fig.update_layout(barmode="stack")
    return base_layout(fig, title, height)


def create_heatmap(z, x_labels, y_labels, title="", height=400):
    fig = go.Figure(go.Heatmap(
        z=z, x=x_labels, y=y_labels,
        colorscale="Blues", hoverongaps=False,
    ))
    fig.update_layout(yaxis=dict(autorange="reversed"))
    return base_layout(fig, title, height)


def create_histogram(df, x, color=None, title="", height=400, nbins=50):
    fig = go.Figure()
    if color and color in df.columns:
        color_map = {"member": MEMBER_COLOR, "casual": CASUAL_COLOR}
        for val in df[color].unique():
            sub = df[df[color] == val]
            fig.add_trace(go.Histogram(x=sub[x], name=val.title(), marker_color=color_map.get(val, CITI_BLUE),
                                       opacity=0.7, nbinsx=nbins))
        fig.update_layout(barmode="overlay")
    else:
        fig.add_trace(go.Histogram(x=df[x], marker_color=CITI_BLUE, nbinsx=nbins))
    return base_layout(fig, title, height)


def create_diverging_bar(df, labels, values, title="", height=500):
    colors = [POSITIVE if v >= 0 else NEGATIVE for v in values]
    fig = go.Figure(go.Bar(
        x=values, y=labels, orientation="h",
        marker_color=colors,
    ))
    fig.update_layout(yaxis=dict(autorange="reversed"))
    return base_layout(fig, title, height)
