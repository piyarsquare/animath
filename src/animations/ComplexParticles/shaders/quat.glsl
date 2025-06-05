struct quat { float w; vec3 v; };

quat quatMul(in quat a, in quat b){
    return quat(
        a.w*b.w - dot(a.v, b.v),
        a.w*b.v + b.w*a.v + cross(a.v, b.v)
    );
}

vec4 quatRotate4D(in vec4 p, in quat a, in quat b){
    quat q = quat(p.w, p.xyz);
    quat r = quatMul(quatMul(a, q), quat(b.w, -b.v));
    return vec4(r.v.x, r.v.y, r.v.z, r.w);
}
